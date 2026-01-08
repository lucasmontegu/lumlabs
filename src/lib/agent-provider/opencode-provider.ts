/**
 * OpenCode Agent Provider
 *
 * Implements AgentProvider interface using OpenCode REST API.
 * OpenCode runs inside Daytona sandboxes on port 8080.
 */

import { daytona } from "@/lib/daytona";
import { createOpenCodeClient, type OpenCodeEvent } from "@/lib/opencode";
import type {
  AgentProvider,
  AgentSession,
  AgentStreamEvent,
  CreateAgentSessionOptions,
  SendAgentMessageOptions,
} from "./types";

// Store session mappings: our session ID -> OpenCode session ID
const sessionMap = new Map<string, { opencodeSessionId: string; workspaceId: string }>();

export class OpenCodeProvider implements AgentProvider {
  readonly type = "opencode" as const;

  async createSession(options: CreateAgentSessionOptions): Promise<AgentSession> {
    const { sandboxId, workspaceId, systemPrompt, model, skills } = options;

    // Get preview URL from Daytona
    const previewUrl = await daytona.getPreviewUrl(workspaceId);

    // Create OpenCode client and session
    const opencode = createOpenCodeClient(previewUrl);
    const opencodeSession = await opencode.createSession({
      systemPrompt,
      model,
      skills,
    });

    // Store mapping
    sessionMap.set(sandboxId, {
      opencodeSessionId: opencodeSession.id,
      workspaceId,
    });

    return {
      id: sandboxId,
      providerId: opencodeSession.id,
      provider: "opencode",
      status: opencodeSession.status,
      createdAt: new Date(opencodeSession.createdAt),
    };
  }

  async getSession(sessionId: string, workspaceId: string): Promise<AgentSession | null> {
    try {
      const mapping = sessionMap.get(sessionId);
      if (!mapping) return null;

      const previewUrl = await daytona.getPreviewUrl(workspaceId);
      const opencode = createOpenCodeClient(previewUrl);
      const opencodeSession = await opencode.getSession(mapping.opencodeSessionId);

      return {
        id: sessionId,
        providerId: opencodeSession.id,
        provider: "opencode",
        status: opencodeSession.status,
        createdAt: new Date(opencodeSession.createdAt),
      };
    } catch {
      return null;
    }
  }

  async *sendMessage(
    options: SendAgentMessageOptions
  ): AsyncGenerator<AgentStreamEvent, void, unknown> {
    const { sessionId, workspaceId, content, previewUrl: providedPreviewUrl } = options;

    const mapping = sessionMap.get(sessionId);
    if (!mapping) {
      yield {
        type: "error",
        content: "Session not found",
      };
      return;
    }

    // Get preview URL
    const previewUrl = providedPreviewUrl || await daytona.getPreviewUrl(workspaceId);

    // Send preview URL event
    yield {
      type: "preview_url",
      content: previewUrl,
    };

    // Create OpenCode client and send message
    const opencode = createOpenCodeClient(previewUrl);

    try {
      for await (const event of opencode.sendMessage({
        sessionId: mapping.opencodeSessionId,
        content,
      })) {
        yield this.transformEvent(event);
      }
    } catch (error) {
      yield {
        type: "error",
        content: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async cancelOperation(sessionId: string, workspaceId: string): Promise<void> {
    const mapping = sessionMap.get(sessionId);
    if (!mapping) return;

    const previewUrl = await daytona.getPreviewUrl(workspaceId);
    const opencode = createOpenCodeClient(previewUrl);
    await opencode.cancelOperation(mapping.opencodeSessionId);
  }

  async deleteSession(sessionId: string, workspaceId: string): Promise<void> {
    const mapping = sessionMap.get(sessionId);
    if (!mapping) return;

    const previewUrl = await daytona.getPreviewUrl(workspaceId);
    const opencode = createOpenCodeClient(previewUrl);
    await opencode.deleteSession(mapping.opencodeSessionId);

    sessionMap.delete(sessionId);
  }

  /**
   * Transform OpenCode event to common AgentStreamEvent format
   */
  private transformEvent(event: OpenCodeEvent): AgentStreamEvent {
    switch (event.type) {
      case "message":
        return {
          type: this.detectMessageType(event.data.content || ""),
          content: event.data.content || "",
          messageId: event.data.messageId,
        };

      case "tool_call":
        return {
          type: "tool_use",
          content: `Using tool: ${event.data.toolCall?.name || "unknown"}`,
          metadata: event.data.toolCall ? { toolCall: event.data.toolCall } : undefined,
        };

      case "tool_result":
        return {
          type: "tool_result",
          content: event.data.toolCall?.result || "",
          metadata: event.data.toolCall ? { toolCall: event.data.toolCall } : undefined,
        };

      case "error":
        return {
          type: "error",
          content: event.data.error || "Unknown error",
        };

      case "done":
        return {
          type: "done",
          content: "Completed",
          messageId: event.data.messageId,
        };

      default:
        return {
          type: "message",
          content: JSON.stringify(event.data),
        };
    }
  }

  /**
   * Detect message type based on content
   */
  private detectMessageType(content: string): AgentStreamEvent["type"] {
    const lowerContent = content.toLowerCase();

    // Check for plan indicators
    if (
      lowerContent.includes("what i'll do") ||
      lowerContent.includes("plan:") ||
      lowerContent.includes("here's my plan") ||
      lowerContent.includes("i propose")
    ) {
      return "plan";
    }

    // Check for questions
    if (
      content.includes("?") &&
      (lowerContent.includes("do you want") ||
        lowerContent.includes("should i") ||
        lowerContent.includes("would you like") ||
        lowerContent.includes("can you clarify"))
    ) {
      return "question";
    }

    // Check for progress updates
    if (
      lowerContent.includes("working on") ||
      lowerContent.includes("updating") ||
      lowerContent.includes("creating") ||
      lowerContent.includes("modifying")
    ) {
      return "progress";
    }

    return "message";
  }
}

// Export singleton instance
export const openCodeProvider = new OpenCodeProvider();
