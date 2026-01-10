/**
 * Coding Agent - Runs inside Daytona sandbox
 * Uses Claude Agent SDK v2 (TypeScript) to execute coding tasks
 *
 * This file is uploaded to the sandbox and executed via code interpreter.
 * Features:
 * - Skills system for context injection
 * - Hooks for lifecycle events
 * - Multi-user session support
 * - Plan-first workflow (no code shown to users)
 */

import {
  type Tool,
  type Message,
} from "@anthropic-ai/claude-agent-sdk";

// ============================================================================
// TYPES
// ============================================================================

export interface AgentMessage {
  type: AgentMessageType;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

export type AgentMessageType =
  | "thinking"
  | "plan"
  | "question"
  | "progress"
  | "result"
  | "error"
  | "tool_use"
  | "tool_result"
  | "text"
  | "file_change"
  | "checkpoint"
  | "done";

export interface Skill {
  name: string;
  slug: string;
  description: string;
  content: string;
  triggers?: string[];
}

export interface Hook {
  name: string;
  event: HookEvent;
  handler: (context: HookContext) => Promise<void> | void;
}

export type HookEvent =
  | "session_start"
  | "before_plan"
  | "after_plan"
  | "before_build"
  | "after_build"
  | "file_write"
  | "file_read"
  | "command_run"
  | "error"
  | "session_end";

export interface HookContext {
  sessionId: string;
  workspaceDir: string;
  previewUrl?: string;
  event: HookEvent;
  data?: Record<string, unknown>;
}

export interface AgentConfig {
  workspaceDir: string;
  previewUrl?: string;
  skills?: Skill[];
  hooks?: Hook[];
  repoContext?: RepoContext;
  sessionId?: string;
  userId?: string;
}

export interface RepoContext {
  name: string;
  description?: string;
  techStack?: string[];
  conventions?: string[];
  keyFiles?: { path: string; description: string }[];
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

function buildSystemPrompt(config: AgentConfig): string {
  const basePrompt = `You are a product builder assistant helping non-technical users build features for their applications.

## Your Role
- You help users describe and build features in plain language
- You NEVER show code directly to users - only results and previews
- You communicate in simple, non-technical language
- Focus on WHAT the user will see, not HOW it's implemented

## CRITICAL: Plan-First Mode
Before making ANY changes, you MUST:
1. Understand what the user wants to achieve
2. Ask clarifying questions if the request is ambiguous
3. Present a plan in plain language explaining:
   - What you will do (in user-friendly terms)
   - What files will be affected (just names, no technical details)
   - What the user will see when it's done
4. Wait for explicit approval before proceeding

## Plan Format
When presenting a plan, ALWAYS use this EXACT JSON format wrapped in a code block:

\`\`\`json
{
  "type": "plan",
  "summary": "One sentence describing what will be built",
  "changes": [
    {
      "description": "User-friendly description of what will change",
      "files": ["file1.tsx", "file2.ts"]
    }
  ],
  "considerations": "Any important notes or potential issues"
}
\`\`\`

## During Build
- Provide progress updates in plain language
- Focus on what's happening, not how
- After each significant file change, say what was updated
- If something fails, explain the issue simply and suggest solutions

## Communication Style
- Use simple, friendly language
- Avoid technical jargon (no "components", "state", "props", etc.)
- Focus on what the user will SEE and EXPERIENCE
- Use analogies to familiar concepts when explaining`;

  // Add repo context if available
  let contextSection = "";
  if (config.repoContext) {
    const { name, description, techStack, conventions, keyFiles } = config.repoContext;
    contextSection = `

## Project Context
- **Project**: ${name}${description ? ` - ${description}` : ""}${techStack?.length ? `
- **Technologies**: ${techStack.join(", ")}` : ""}${conventions?.length ? `
- **Conventions**: ${conventions.join("; ")}` : ""}${keyFiles?.length ? `
- **Key Files**: ${keyFiles.map((f) => `${f.path} (${f.description})`).join(", ")}` : ""}`;
  }

  // Add skills if available
  let skillsSection = "";
  if (config.skills && config.skills.length > 0) {
    skillsSection = `

## Available Skills
${config.skills.map((s) => `### ${s.name}
${s.content}`).join("\n\n")}`;
  }

  // Add preview URL if available
  let previewSection = "";
  if (config.previewUrl) {
    previewSection = `

## Live Preview
The user can see a live preview at: ${config.previewUrl}
After making changes, remind them to check the preview to see the results.`;
  }

  return basePrompt + contextSection + skillsSection + previewSection;
}

// ============================================================================
// HOOKS SYSTEM
// ============================================================================

class HooksManager {
  private hooks: Map<HookEvent, Hook[]> = new Map();

  register(hook: Hook): void {
    const existing = this.hooks.get(hook.event) || [];
    existing.push(hook);
    this.hooks.set(hook.event, existing);
  }

  registerMany(hooks: Hook[]): void {
    hooks.forEach((hook) => this.register(hook));
  }

  async trigger(event: HookEvent, context: HookContext): Promise<void> {
    const handlers = this.hooks.get(event) || [];
    for (const hook of handlers) {
      try {
        await hook.handler({ ...context, event });
      } catch (error) {
        console.error(`Hook ${hook.name} failed:`, error);
      }
    }
  }
}

// ============================================================================
// SKILLS LOADER
// ============================================================================

function loadMatchingSkills(skills: Skill[], userMessage: string): Skill[] {
  const lowerMessage = userMessage.toLowerCase();
  return skills.filter((skill) => {
    if (!skill.triggers || skill.triggers.length === 0) return true;
    return skill.triggers.some((trigger) => lowerMessage.includes(trigger.toLowerCase()));
  });
}

// Default skills for common patterns
const DEFAULT_SKILLS: Skill[] = [
  {
    name: "UI Components",
    slug: "ui-components",
    description: "Guidelines for UI component creation",
    triggers: ["button", "form", "modal", "dialog", "input", "select", "card"],
    content: `When creating UI elements:
- Use existing component patterns from the project
- Ensure accessibility (proper labels, keyboard navigation)
- Keep styling consistent with the existing design system
- Test on mobile and desktop viewport sizes`,
  },
  {
    name: "API Integration",
    slug: "api-integration",
    description: "Guidelines for API/data fetching",
    triggers: ["api", "fetch", "data", "endpoint", "request", "response"],
    content: `When working with APIs:
- Handle loading and error states gracefully
- Use existing patterns for data fetching in the project
- Add appropriate error messages for users
- Consider caching and optimistic updates where appropriate`,
  },
  {
    name: "Forms",
    slug: "forms",
    description: "Guidelines for form handling",
    triggers: ["form", "input", "validation", "submit", "field"],
    content: `When creating forms:
- Validate inputs before submission
- Show clear error messages next to the relevant field
- Disable submit button while processing
- Provide confirmation on successful submission`,
  },
];

// ============================================================================
// AGENT TOOLS
// ============================================================================

function createAgentTools(config: AgentConfig, emit: (msg: AgentMessage) => void): Tool[] {
  const { workspaceDir } = config;
  const fs = require("fs");
  const path = require("path");
  const { execSync, spawn } = require("child_process");

  return [
    {
      name: "read_file",
      description: "Read the contents of a file. Use this to understand existing code before making changes.",
      input_schema: {
        type: "object" as const,
        properties: {
          path: { type: "string", description: "File path relative to workspace" },
        },
        required: ["path"],
      },
      execute: async (input: { path: string }) => {
        const fullPath = path.join(workspaceDir, input.path);
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          return { success: true, content };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      name: "write_file",
      description: "Write content to a file. This will create or overwrite the file.",
      input_schema: {
        type: "object" as const,
        properties: {
          path: { type: "string", description: "File path relative to workspace" },
          content: { type: "string", description: "Content to write" },
        },
        required: ["path", "content"],
      },
      execute: async (input: { path: string; content: string }) => {
        const fullPath = path.join(workspaceDir, input.path);
        try {
          // Ensure directory exists
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, input.content, "utf-8");

          // Emit file change event
          emit({
            type: "file_change",
            content: `Updated: ${input.path}`,
            metadata: { path: input.path, action: "write" },
          });

          return { success: true, message: `File written: ${input.path}` };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      name: "list_files",
      description: "List files in a directory to understand project structure.",
      input_schema: {
        type: "object" as const,
        properties: {
          dir: { type: "string", description: "Directory path relative to workspace" },
          pattern: { type: "string", description: "Optional glob pattern to filter files" },
        },
        required: ["dir"],
      },
      execute: async (input: { dir: string; pattern?: string }) => {
        const fullPath = path.join(workspaceDir, input.dir);
        try {
          const files = fs.readdirSync(fullPath, { withFileTypes: true });
          const result = files.map((f: { isDirectory: () => boolean; name: string }) => ({
            name: f.name,
            isDirectory: f.isDirectory(),
          }));
          return { success: true, files: result };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      name: "run_command",
      description: "Run a shell command in the workspace. Use for npm install, running tests, etc.",
      input_schema: {
        type: "object" as const,
        properties: {
          command: { type: "string", description: "Command to run" },
          background: { type: "boolean", description: "Run in background (for dev servers)" },
        },
        required: ["command"],
      },
      execute: async (input: { command: string; background?: boolean }) => {
        try {
          emit({
            type: "progress",
            content: `Running: ${input.command.slice(0, 50)}...`,
          });

          if (input.background) {
            const child = spawn("sh", ["-c", input.command], {
              cwd: workspaceDir,
              detached: true,
              stdio: "ignore",
            });
            child.unref();
            return { success: true, message: "Command started in background" };
          }

          const result = execSync(input.command, {
            cwd: workspaceDir,
            encoding: "utf-8",
            timeout: 60000,
          });
          return { success: true, output: result };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      name: "search_files",
      description: "Search for a pattern in files. Use to find where things are defined.",
      input_schema: {
        type: "object" as const,
        properties: {
          pattern: { type: "string", description: "Search pattern (regex)" },
          filePattern: { type: "string", description: "File glob pattern (e.g., '*.ts')" },
        },
        required: ["pattern"],
      },
      execute: async (input: { pattern: string; filePattern?: string }) => {
        try {
          const grepCmd = input.filePattern
            ? `grep -rn "${input.pattern}" --include="${input.filePattern}" .`
            : `grep -rn "${input.pattern}" .`;
          const result = execSync(grepCmd, {
            cwd: workspaceDir,
            encoding: "utf-8",
            maxBuffer: 1024 * 1024,
          });
          const lines = result.split("\n").slice(0, 20);
          return { success: true, matches: lines };
        } catch {
          return { success: true, matches: [] };
        }
      },
    },
  ];
}

// ============================================================================
// AGENT SESSION
// ============================================================================

interface AgentSession {
  config: AgentConfig;
  hooks: HooksManager;
  conversationHistory: Message[];
  isBuilding: boolean;
}

const sessions = new Map<string, AgentSession>();

function getOrCreateSession(sessionId: string, config: AgentConfig): AgentSession {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      config,
      hooks: new HooksManager(),
      conversationHistory: [],
      isBuilding: false,
    };

    // Register default hooks
    session.hooks.register({
      name: "log-session-start",
      event: "session_start",
      handler: (ctx) => {
        console.log(`[Agent] Session started: ${ctx.sessionId}`);
      },
    });

    // Register custom hooks if provided
    if (config.hooks) {
      session.hooks.registerMany(config.hooks);
    }

    sessions.set(sessionId, session);
  }
  return session;
}

// ============================================================================
// MAIN QUERY FUNCTION
// ============================================================================

/**
 * Run a query through the coding agent
 * Streams messages to stdout for the parent process to capture
 */
export async function runQuery(
  prompt: string,
  workspaceDir: string = "/workspace/repo",
  previewUrl?: string,
  options?: {
    sessionId?: string;
    userId?: string;
    skills?: Skill[];
    repoContext?: RepoContext;
    phase?: "planning" | "building";
  }
): Promise<void> {
  const sessionId = options?.sessionId || `session_${Date.now()}`;

  // Build config
  const config: AgentConfig = {
    workspaceDir,
    previewUrl,
    skills: [...DEFAULT_SKILLS, ...(options?.skills || [])],
    repoContext: options?.repoContext,
    sessionId,
    userId: options?.userId,
  };

  // Get or create session
  const session = getOrCreateSession(sessionId, config);

  // Helper to emit messages
  const emit = (msg: AgentMessage) => {
    console.log(JSON.stringify({ ...msg, timestamp: Date.now() }));
  };

  // Trigger session start hook
  await session.hooks.trigger("session_start", {
    sessionId,
    workspaceDir,
    previewUrl,
    event: "session_start",
  });

  // Load matching skills
  const matchedSkills = loadMatchingSkills(config.skills || [], prompt);
  const configWithMatchedSkills = { ...config, skills: matchedSkills };

  // Build system prompt
  const systemPrompt = buildSystemPrompt(configWithMatchedSkills);

  // Create tools
  const tools = createAgentTools(config, emit);

  try {
    // Trigger before_plan or before_build hook
    const hookEvent = options?.phase === "building" ? "before_build" : "before_plan";
    await session.hooks.trigger(hookEvent, {
      sessionId,
      workspaceDir,
      previewUrl,
      event: hookEvent,
      data: { prompt },
    });

    emit({ type: "thinking", content: "Analyzing your request..." });

    // Import Claude Agent SDK dynamically (it's installed in the sandbox)
    const { createSession } = await import("@anthropic-ai/claude-agent-sdk");

    // Create agent session with v2 API
    await using agentSession = await createSession({
      model: "claude-sonnet-4-20250514",
      system: systemPrompt,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      })),
      maxTurns: 50,
    });

    // Add user message to history
    session.conversationHistory.push({
      role: "user",
      content: prompt,
    });

    // Send message and stream response
    agentSession.send({ messages: session.conversationHistory });

    let fullResponse = "";

    for await (const event of agentSession.stream()) {
      if (event.type === "text") {
        fullResponse += event.text;

        // Check if this is a plan
        if (fullResponse.includes('"type": "plan"') || fullResponse.includes('"type":"plan"')) {
          emit({ type: "plan", content: event.text });
        } else {
          emit({ type: "text", content: event.text });
        }
      } else if (event.type === "tool_use") {
        emit({
          type: "tool_use",
          content: `Using: ${event.name}`,
          metadata: { tool: event.name, input: event.input },
        });

        // Execute the tool
        const tool = tools.find((t) => t.name === event.name);
        if (tool && tool.execute) {
          const result = await tool.execute(event.input);
          emit({
            type: "tool_result",
            content: result.success ? "Done" : `Error: ${result.error}`,
            metadata: { tool: event.name, result },
          });
        }
      } else if (event.type === "error") {
        emit({ type: "error", content: event.error?.message || "Unknown error" });
      }
    }

    // Store response in history
    session.conversationHistory.push({
      role: "assistant",
      content: fullResponse,
    });

    // Trigger after hook
    const afterHookEvent = options?.phase === "building" ? "after_build" : "after_plan";
    await session.hooks.trigger(afterHookEvent, {
      sessionId,
      workspaceDir,
      previewUrl,
      event: afterHookEvent,
      data: { response: fullResponse },
    });

    emit({ type: "done", content: "Completed" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Trigger error hook
    await session.hooks.trigger("error", {
      sessionId,
      workspaceDir,
      previewUrl,
      event: "error",
      data: { error: errorMessage },
    });

    emit({ type: "error", content: errorMessage });
  }
}

/**
 * Continue a conversation in an existing session
 */
export async function continueQuery(
  sessionId: string,
  prompt: string,
  phase?: "planning" | "building"
): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) {
    console.log(
      JSON.stringify({
        type: "error",
        content: `Session ${sessionId} not found. Call runQuery first.`,
      })
    );
    return;
  }

  return runQuery(prompt, session.config.workspaceDir, session.config.previewUrl, {
    sessionId,
    userId: session.config.userId,
    skills: session.config.skills,
    repoContext: session.config.repoContext,
    phase,
  });
}

/**
 * Clear a session's conversation history
 */
export function clearSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.conversationHistory = [];
    console.log(JSON.stringify({ type: "result", content: "Session cleared" }));
  }
}

/**
 * End a session and clean up
 */
export async function endSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (session) {
    await session.hooks.trigger("session_end", {
      sessionId,
      workspaceDir: session.config.workspaceDir,
      previewUrl: session.config.previewUrl,
      event: "session_end",
    });
    sessions.delete(sessionId);
    console.log(JSON.stringify({ type: "result", content: "Session ended" }));
  }
}

// Export for use in sandbox
export default {
  runQuery,
  continueQuery,
  clearSession,
  endSession,
  DEFAULT_SKILLS,
};
