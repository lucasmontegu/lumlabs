/**
 * Claude Agent SDK Provider
 *
 * Implements AgentProvider interface using Claude Agent SDK.
 * The agent runs inside Daytona sandboxes via code interpreter.
 */

import { daytona, type AgentStreamEvent as DaytonaStreamEvent } from "@/lib/daytona";
import type {
  AgentProvider,
  AgentSession,
  AgentStreamEvent,
  CreateAgentSessionOptions,
  SendAgentMessageOptions,
} from "./types";

// Store context IDs: session ID -> context ID
const contextMap = new Map<string, { contextId: string; workspaceId: string }>();

export class ClaudeAgentProvider implements AgentProvider {
  readonly type = "claude-agent-sdk" as const;

  async createSession(options: CreateAgentSessionOptions): Promise<AgentSession> {
    const { sandboxId, workspaceId } = options;

    // Ensure workspace exists and is running
    const workspace = await daytona.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    if (workspace.status !== "running") {
      await daytona.resumeWorkspace(workspaceId);
    }

    // The context is created lazily when first message is sent
    // For now, just store the mapping
    contextMap.set(sandboxId, {
      contextId: "", // Will be set on first message
      workspaceId,
    });

    return {
      id: sandboxId,
      providerId: workspaceId, // Use workspace ID as provider ID
      provider: "claude-agent-sdk",
      status: "idle",
      createdAt: new Date(),
    };
  }

  async getSession(sessionId: string, workspaceId: string): Promise<AgentSession | null> {
    try {
      const mapping = contextMap.get(sessionId);
      if (!mapping) return null;

      const workspace = await daytona.getWorkspace(workspaceId);
      if (!workspace) return null;

      return {
        id: sessionId,
        providerId: mapping.contextId || workspaceId,
        provider: "claude-agent-sdk",
        status: workspace.status === "running" ? "idle" : "error",
        createdAt: new Date(),
      };
    } catch {
      return null;
    }
  }

  async *sendMessage(
    options: SendAgentMessageOptions
  ): AsyncGenerator<AgentStreamEvent, void, unknown> {
    const { sessionId, workspaceId, content } = options;

    // Get or create mapping
    let mapping = contextMap.get(sessionId);
    if (!mapping) {
      mapping = { contextId: "", workspaceId };
      contextMap.set(sessionId, mapping);
    }

    // Get preview URL
    let previewUrl: string;
    try {
      previewUrl = await daytona.getPreviewUrl(workspaceId);
    } catch {
      previewUrl = "";
    }

    // Send preview URL event if available
    if (previewUrl) {
      yield {
        type: "preview_url",
        content: previewUrl,
      };
    }

    // Send start event
    yield {
      type: "start",
      content: "Starting agent...",
    };

    try {
      // Stream from Daytona agent
      for await (const event of daytona.runAgentQuery(workspaceId, content)) {
        yield this.transformEvent(event);

        if (event.type === "done") {
          break;
        }
      }
    } catch (error) {
      yield {
        type: "error",
        content: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async cancelOperation(_sessionId: string, workspaceId: string): Promise<void> {
    // Claude Agent SDK doesn't have a direct cancel mechanism
    // We could potentially pause/resume the workspace, but that's heavy-handed
    // For now, this is a no-op
    console.warn(`[ClaudeAgentProvider] Cancel not fully supported for workspace ${workspaceId}`);
  }

  async deleteSession(sessionId: string, _workspaceId: string): Promise<void> {
    // Remove from context map
    contextMap.delete(sessionId);
    // Note: We don't delete the workspace here as it might be shared
  }

  /**
   * Transform Daytona stream event to common AgentStreamEvent format
   */
  private transformEvent(event: DaytonaStreamEvent): AgentStreamEvent {
    // Map Daytona event types to our common types
    switch (event.type) {
      case "message":
        return {
          type: "message",
          content: event.content,
          metadata: event.metadata,
        };

      case "plan":
        return {
          type: "plan",
          content: event.content,
          metadata: event.metadata,
        };

      case "question":
        return {
          type: "question",
          content: event.content,
          metadata: event.metadata,
        };

      case "progress":
        return {
          type: "progress",
          content: event.content,
          metadata: event.metadata,
        };

      case "tool_use":
        return {
          type: "tool_use",
          content: event.content,
          metadata: event.metadata,
        };

      case "error":
        return {
          type: "error",
          content: event.content,
          metadata: event.metadata,
        };

      case "done":
        return {
          type: "done",
          content: event.content || "Completed",
          metadata: event.metadata,
        };

      default:
        return {
          type: "message",
          content: event.content,
          metadata: event.metadata,
        };
    }
  }
}

// Export singleton instance
export const claudeAgentProvider = new ClaudeAgentProvider();
