/**
 * Agent Orchestrator
 *
 * Manages the full plan->build->review flow using Claude Agent SDK inside Daytona sandboxes.
 * Coordinates between planning, execution, and review phases while streaming updates to the client.
 */

import { daytona } from "@/lib/daytona";
import { loadSkillsForSession, type SkillContext } from "@/features/skills";
import { db } from "@/db";
import {
  featureSessions,
  messages,
  checkpoints,
  approvals,
  repositories,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/id";

// ============================================================================
// TYPES
// ============================================================================

export type OrchestrationPhase =
  | "idle"
  | "planning"
  | "plan_review"
  | "building"
  | "ready"
  | "error";

export interface OrchestrationContext {
  sessionId: string;
  repositoryId: string;
  sandboxId: string;
  daytonaWorkspaceId: string;
  organizationId: string;
  userId: string;
}

export interface StreamEvent {
  type:
    | "phase_change"
    | "thinking"
    | "plan"
    | "message"
    | "progress"
    | "file_change"
    | "tool_use"
    | "checkpoint"
    | "preview_url"
    | "error"
    | "done";
  content: string;
  phase?: OrchestrationPhase;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

export interface PlanData {
  summary: string;
  changes: Array<{
    description: string;
    files?: string[];
  }>;
  considerations?: string;
}

export interface RepoContext {
  name: string;
  description?: string;
  techStack?: string[];
  conventions?: string[];
  keyFiles?: Array<{ path: string; description: string }>;
}

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

export class AgentOrchestrator {
  private ctx: OrchestrationContext;
  private repoContext: RepoContext | null = null;
  private skills: SkillContext[] = [];
  private previewUrl: string = "";

  constructor(context: OrchestrationContext) {
    this.ctx = context;
  }

  /**
   * Initialize the orchestrator by loading repo context and skills
   */
  async initialize(): Promise<void> {
    // Load repository context
    const repo = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, this.ctx.repositoryId))
      .limit(1);

    if (repo[0]) {
      const context = repo[0].context as RepoContext | null;
      this.repoContext = context || {
        name: repo[0].name,
        techStack: [],
      };
    }

    // Load skills for this session
    this.skills = await loadSkillsForSession(this.ctx.repositoryId);

    // Get preview URL
    try {
      this.previewUrl = await daytona.getPreviewUrl(this.ctx.daytonaWorkspaceId);
    } catch {
      console.warn(`[Orchestrator] Could not get preview URL`);
    }
  }

  /**
   * Generate a plan for a user request
   * This is the first phase of the workflow
   */
  async *generatePlan(request: string): AsyncGenerator<StreamEvent> {
    yield {
      type: "phase_change",
      phase: "planning",
      content: "Starting plan generation",
      timestamp: Date.now(),
    };

    // Update session status
    await db
      .update(featureSessions)
      .set({ status: "planning", updatedAt: new Date() })
      .where(eq(featureSessions.id, this.ctx.sessionId));

    yield {
      type: "thinking",
      content: "Analyzing your request...",
      phase: "planning",
      timestamp: Date.now(),
    };

    try {
      // Stream from the Daytona agent
      const agentStream = daytona.runAgentQuery(
        this.ctx.daytonaWorkspaceId,
        this.buildPlanPrompt(request)
      );

      let planContent = "";
      let hasPlan = false;

      for await (const event of agentStream) {
        // Check if this is plan content
        if (event.content.includes('"type": "plan"') ||
            event.content.includes('"type":"plan"') ||
            event.type === "plan") {
          planContent += event.content;
          hasPlan = true;
          yield {
            type: "plan",
            content: event.content,
            phase: "planning",
            metadata: event.metadata,
            timestamp: Date.now(),
          };
        } else if (event.type === "done") {
          // Finished streaming
          break;
        } else if (event.type === "error") {
          yield {
            type: "error",
            content: event.content,
            phase: "planning",
            timestamp: Date.now(),
          };
        } else {
          // Regular message
          yield {
            type: "message",
            content: event.content,
            phase: "planning",
            metadata: event.metadata,
            timestamp: Date.now(),
          };
        }
      }

      // Parse the plan
      const plan = this.parsePlan(planContent);

      if (!plan) {
        throw new Error("Failed to generate a valid plan");
      }

      // Save plan message to database
      const messageId = generateId("msg");
      await db.insert(messages).values({
        id: messageId,
        sessionId: this.ctx.sessionId,
        role: "assistant",
        content: JSON.stringify(plan),
        phase: "planning",
        metadata: { type: "plan" },
        createdAt: new Date(),
      });

      // Create pending approval
      const approvalId = generateId("appr");
      await db.insert(approvals).values({
        id: approvalId,
        sessionId: this.ctx.sessionId,
        messageId,
        status: "pending",
        createdAt: new Date(),
      });

      // Update session to plan_review
      await db
        .update(featureSessions)
        .set({ status: "plan_review", updatedAt: new Date() })
        .where(eq(featureSessions.id, this.ctx.sessionId));

      yield {
        type: "phase_change",
        phase: "plan_review",
        content: "Plan ready for review",
        metadata: { messageId, approvalId, plan },
        timestamp: Date.now(),
      };

      yield {
        type: "done",
        content: "Plan generation complete",
        phase: "plan_review",
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await db
        .update(featureSessions)
        .set({ status: "error", updatedAt: new Date() })
        .where(eq(featureSessions.id, this.ctx.sessionId));

      yield {
        type: "error",
        content: errorMessage,
        phase: "planning",
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Execute an approved plan
   * This is the building phase
   */
  async *executePlan(plan: PlanData): AsyncGenerator<StreamEvent> {
    yield {
      type: "phase_change",
      phase: "building",
      content: "Starting build",
      timestamp: Date.now(),
    };

    // Update session status
    await db
      .update(featureSessions)
      .set({ status: "building", updatedAt: new Date() })
      .where(eq(featureSessions.id, this.ctx.sessionId));

    // Emit preview URL
    if (this.previewUrl) {
      yield {
        type: "preview_url",
        content: this.previewUrl,
        phase: "building",
        timestamp: Date.now(),
      };
    }

    try {
      // Build the execution prompt
      const execPrompt = this.buildExecutionPrompt(plan);

      // Stream from the agent
      const agentStream = daytona.runAgentQuery(
        this.ctx.daytonaWorkspaceId,
        execPrompt
      );

      const changedFiles: string[] = [];

      for await (const event of agentStream) {
        if (event.type === "done") {
          break;
        }

        if (event.type === "error") {
          yield {
            type: "error",
            content: event.content,
            phase: "building",
            timestamp: Date.now(),
          };
          continue;
        }

        // Track file changes
        if (event.type === "progress" && event.metadata?.path) {
          changedFiles.push(event.metadata.path as string);
          yield {
            type: "file_change",
            content: event.content,
            phase: "building",
            metadata: event.metadata,
            timestamp: Date.now(),
          };
        } else if (event.type === "tool_use") {
          yield {
            type: "tool_use",
            content: event.content,
            phase: "building",
            metadata: event.metadata,
            timestamp: Date.now(),
          };
        } else {
          yield {
            type: "progress",
            content: event.content,
            phase: "building",
            metadata: event.metadata,
            timestamp: Date.now(),
          };
        }
      }

      // Create automatic checkpoint after build
      try {
        const checkpointId = await daytona.createCheckpoint(
          this.ctx.daytonaWorkspaceId,
          `Build: ${plan.summary.slice(0, 50)}`
        );

        // Save checkpoint to database
        const dbCheckpointId = generateId("chkpt");
        await db.insert(checkpoints).values({
          id: dbCheckpointId,
          sessionId: this.ctx.sessionId,
          sandboxId: this.ctx.sandboxId,
          label: `Build: ${plan.summary}`,
          type: "auto",
          daytonaCheckpointId: checkpointId,
          createdAt: new Date(),
        });

        yield {
          type: "checkpoint",
          content: "Checkpoint created",
          phase: "building",
          metadata: { checkpointId: dbCheckpointId },
          timestamp: Date.now(),
        };
      } catch (err) {
        console.warn("[Orchestrator] Could not create checkpoint:", err);
      }

      // Save build complete message
      const messageId = generateId("msg");
      await db.insert(messages).values({
        id: messageId,
        sessionId: this.ctx.sessionId,
        role: "assistant",
        content: `Build completed successfully. ${changedFiles.length} files were updated.`,
        phase: "building",
        metadata: { changedFiles },
        createdAt: new Date(),
      });

      // Update session to ready
      await db
        .update(featureSessions)
        .set({ status: "ready", updatedAt: new Date() })
        .where(eq(featureSessions.id, this.ctx.sessionId));

      yield {
        type: "phase_change",
        phase: "ready",
        content: "Build complete",
        metadata: { changedFiles },
        timestamp: Date.now(),
      };

      yield {
        type: "done",
        content: "Build execution complete",
        phase: "ready",
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await db
        .update(featureSessions)
        .set({ status: "error", updatedAt: new Date() })
        .where(eq(featureSessions.id, this.ctx.sessionId));

      yield {
        type: "error",
        content: errorMessage,
        phase: "building",
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Handle a follow-up message (clarification, adjustment, etc.)
   */
  async *handleMessage(message: string): AsyncGenerator<StreamEvent> {
    yield {
      type: "thinking",
      content: "Processing your message...",
      timestamp: Date.now(),
    };

    try {
      const agentStream = daytona.runAgentQuery(
        this.ctx.daytonaWorkspaceId,
        message
      );

      for await (const event of agentStream) {
        if (event.type === "done") {
          break;
        }

        yield {
          type: event.type as StreamEvent["type"],
          content: event.content,
          metadata: event.metadata,
          timestamp: Date.now(),
        };
      }

      yield {
        type: "done",
        content: "Message processed",
        timestamp: Date.now(),
      };
    } catch (error) {
      yield {
        type: "error",
        content: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Build the planning prompt with context
   */
  private buildPlanPrompt(request: string): string {
    const contextParts: string[] = [];

    // Add repo context
    if (this.repoContext) {
      contextParts.push(`
## Project Context
- **Name**: ${this.repoContext.name}
${this.repoContext.description ? `- **Description**: ${this.repoContext.description}` : ""}
${this.repoContext.techStack?.length ? `- **Tech Stack**: ${this.repoContext.techStack.join(", ")}` : ""}
${this.repoContext.conventions?.length ? `- **Conventions**: ${this.repoContext.conventions.join("; ")}` : ""}
${this.repoContext.keyFiles?.length ? `- **Key Files**: ${this.repoContext.keyFiles.map((f) => `${f.path} (${f.description})`).join(", ")}` : ""}`);
    }

    // Add skills
    if (this.skills.length > 0) {
      contextParts.push(`
## Skills/Guidelines to Follow
${this.skills.map((s) => `### ${s.name}\n${s.content}`).join("\n\n")}`);
    }

    // Add preview URL
    if (this.previewUrl) {
      contextParts.push(`
## Live Preview
The user can see a live preview at: ${this.previewUrl}
After making changes, remind them to check the preview.`);
    }

    return `${contextParts.join("\n")}

## User Request
${request}

Please analyze this request and create a plan. Remember:
1. Do NOT make any changes yet - just create a plan
2. Present the plan in plain language that non-technical users can understand
3. Use the JSON plan format with summary, changes, and considerations
4. Wait for user approval before implementing`;
  }

  /**
   * Build the execution prompt from an approved plan
   */
  private buildExecutionPrompt(plan: PlanData): string {
    return `The user has approved the following plan. Please implement it now.

## Approved Plan

**Summary**: ${plan.summary}

**Changes to make**:
${plan.changes.map((c, i) => `${i + 1}. ${c.description}${c.files?.length ? ` (Files: ${c.files.join(", ")})` : ""}`).join("\n")}

${plan.considerations ? `**Considerations**: ${plan.considerations}` : ""}

## Instructions
1. Implement each change in the plan
2. Provide brief progress updates as you work
3. Create or modify files as needed
4. Run any necessary commands (npm install, etc.)
5. Test that changes work correctly
6. When done, summarize what was accomplished

Remember: Focus on implementing what was approved. If you encounter issues, explain them simply and suggest solutions.`;
  }

  /**
   * Parse plan from agent output
   */
  private parsePlan(content: string): PlanData | null {
    try {
      // Try to extract JSON from the content
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try direct parse
      const directMatch = content.match(/\{[\s\S]*"type"\s*:\s*"plan"[\s\S]*\}/);
      if (directMatch) {
        return JSON.parse(directMatch[0]);
      }

      return null;
    } catch {
      return null;
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create and initialize an orchestrator for a session
 */
export async function createOrchestrator(
  context: OrchestrationContext
): Promise<AgentOrchestrator> {
  const orchestrator = new AgentOrchestrator(context);
  await orchestrator.initialize();
  return orchestrator;
}
