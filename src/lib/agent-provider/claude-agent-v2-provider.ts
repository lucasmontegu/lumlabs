/**
 * Claude Agent SDK V2 Provider
 *
 * Uses the new V2 session-based API with send()/stream() pattern.
 * This provider runs Claude Agent directly (not through Daytona sandboxes).
 */

import {
  unstable_v2_createSession,
  type SDKSession,
  type SDKMessage,
  type SDKSessionOptions,
} from "@anthropic-ai/claude-agent-sdk";

import type {
  AgentProvider,
  AgentSession,
  AgentStreamEvent,
  CreateAgentSessionOptions,
  SendAgentMessageOptions,
} from "./types";

// Store active sessions
const activeSessions = new Map<string, SDKSession>();

export class ClaudeAgentV2Provider implements AgentProvider {
  readonly type = "claude-agent-sdk-v2" as const;

  async createSession(options: CreateAgentSessionOptions): Promise<AgentSession> {
    const { sandboxId, model = "claude-sonnet-4-20250514" } = options;

    const sessionOptions: SDKSessionOptions = {
      model,
      allowedTools: [
        "Read",
        "Write",
        "Edit",
        "Bash",
        "Glob",
        "Grep",
        "WebFetch",
        "WebSearch",
      ],
    };

    const session = unstable_v2_createSession(sessionOptions);
    activeSessions.set(sandboxId, session);

    return {
      id: sandboxId,
      providerId: sandboxId,
      provider: "claude-agent-sdk-v2",
      status: "idle",
      createdAt: new Date(),
    };
  }

  async getSession(sessionId: string): Promise<AgentSession | null> {
    const session = activeSessions.get(sessionId);
    if (!session) return null;

    return {
      id: sessionId,
      providerId: sessionId,
      provider: "claude-agent-sdk-v2",
      status: "idle",
      createdAt: new Date(),
    };
  }

  async *sendMessage(
    options: SendAgentMessageOptions
  ): AsyncGenerator<AgentStreamEvent, void, unknown> {
    const { sessionId, content } = options;

    // Get or create session
    let session = activeSessions.get(sessionId);
    if (!session) {
      session = unstable_v2_createSession({
        model: "claude-sonnet-4-20250514",
        allowedTools: [
          "Read",
          "Write",
          "Edit",
          "Bash",
          "Glob",
          "Grep",
          "WebFetch",
          "WebSearch",
        ],
      });
      activeSessions.set(sessionId, session);
    }

    yield {
      type: "start",
      content: "Starting agent...",
    };

    try {
      // Send the message
      await session.send(content);

      // Stream the response
      for await (const message of session.stream()) {
        const event = this.transformMessage(message);
        if (event) {
          yield event;
        }

        // Check for completion
        if (message.type === "result") {
          break;
        }
      }

      yield {
        type: "done",
        content: "Completed",
      };
    } catch (error) {
      yield {
        type: "error",
        content: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async cancelOperation(sessionId: string): Promise<void> {
    const session = activeSessions.get(sessionId);
    if (session) {
      session.close();
      activeSessions.delete(sessionId);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const session = activeSessions.get(sessionId);
    if (session) {
      session.close();
      activeSessions.delete(sessionId);
    }
  }

  /**
   * Transform SDK message to AgentStreamEvent
   */
  private transformMessage(message: SDKMessage): AgentStreamEvent | null {
    switch (message.type) {
      case "assistant": {
        // Full assistant message with content blocks
        const content = message.message?.content;
        if (content && Array.isArray(content)) {
          const textParts: string[] = [];
          for (const block of content) {
            if (block.type === "text" && "text" in block) {
              textParts.push(block.text);
            }
          }
          const textContent = textParts.join("\n");
          if (textContent) {
            return {
              type: "message",
              content: textContent,
              metadata: { messageId: message.uuid },
            };
          }
        }
        return null;
      }

      case "tool_progress":
        // Tool is being executed
        return {
          type: "tool_use",
          content: `Running ${message.tool_name}...`,
          metadata: {
            toolName: message.tool_name,
            toolId: message.tool_use_id,
            elapsedTime: message.elapsed_time_seconds,
          },
        };

      case "stream_event": {
        // Streaming event (partial content)
        const streamMsg = message as { event?: unknown };
        if (streamMsg.event) {
          const event = streamMsg.event as Record<string, unknown>;
          if (event.type === "content_block_delta") {
            const delta = event.delta as Record<string, unknown> | undefined;
            if (delta && delta.type === "text_delta" && typeof delta.text === "string") {
              return {
                type: "progress",
                content: delta.text,
                metadata: { partial: true },
              };
            }
          }
        }
        return null;
      }

      case "result": {
        // Final result
        const resultMsg = message as { result?: unknown };
        return {
          type: "done",
          content: "Completed",
          metadata: { result: resultMsg.result },
        };
      }

      case "user":
      case "system":
      case "auth_status":
        // Skip these message types
        return null;

      default:
        // Log unknown types for debugging (but don't fail)
        return null;
    }
  }
}

// Export singleton instance
export const claudeAgentV2Provider = new ClaudeAgentV2Provider();
