/**
 * OpenCode SDK Client
 *
 * Wraps the OpenCode REST API for AI-powered code generation:
 * - Session management (create, list, get)
 * - Message sending with streaming responses
 * - Event subscription for real-time updates
 *
 * OpenCode runs inside Daytona sandboxes and provides:
 * - Multi-provider AI (Claude, GPT-4, etc.)
 * - File operations
 * - Terminal execution
 * - Skills/plugins system
 */

export interface OpenCodeSession {
  id: string;
  status: "idle" | "busy" | "error";
  model: string;
  createdAt: string;
}

export interface OpenCodeMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCall[];
  createdAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
}

export interface OpenCodeEvent {
  type: "message" | "tool_call" | "tool_result" | "error" | "done";
  data: {
    content?: string;
    toolCall?: ToolCall;
    error?: string;
    messageId?: string;
  };
}

export interface SendMessageOptions {
  sessionId: string;
  content: string;
  model?: string;
  systemPrompt?: string;
}

export interface CreateSessionOptions {
  model?: string;
  systemPrompt?: string;
  skills?: string[];
}

class OpenCodeClient {
  private baseUrl: string;

  constructor(sandboxUrl: string) {
    // OpenCode runs on port 8080 inside the sandbox
    this.baseUrl = sandboxUrl.replace(/\/$/, "") + ":8080";
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenCode API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Create a new OpenCode session
   */
  async createSession(options: CreateSessionOptions = {}): Promise<OpenCodeSession> {
    return this.fetch<OpenCodeSession>("/session", {
      method: "POST",
      body: JSON.stringify({
        model: options.model || "claude-sonnet-4-20250514",
        systemPrompt: options.systemPrompt,
        skills: options.skills || [],
      }),
    });
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<OpenCodeSession> {
    return this.fetch<OpenCodeSession>(`/session/${sessionId}`);
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<OpenCodeSession[]> {
    return this.fetch<OpenCodeSession[]>("/session");
  }

  /**
   * Send a message and get streaming response
   * Returns an async iterator of events
   */
  async *sendMessage(
    options: SendMessageOptions
  ): AsyncGenerator<OpenCodeEvent, void, unknown> {
    const url = `${this.baseUrl}/session/${options.sessionId}/message`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        content: options.content,
        model: options.model,
        systemPrompt: options.systemPrompt,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenCode API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              yield { type: "done", data: {} };
              return;
            }
            try {
              const event = JSON.parse(data) as OpenCodeEvent;
              yield event;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get message history for a session
   */
  async getMessages(sessionId: string): Promise<OpenCodeMessage[]> {
    return this.fetch<OpenCodeMessage[]>(`/session/${sessionId}/messages`);
  }

  /**
   * Subscribe to session events (SSE)
   * Returns an EventSource-compatible stream
   */
  subscribeToEvents(sessionId: string): EventSource {
    const url = `${this.baseUrl}/session/${sessionId}/events`;
    return new EventSource(url);
  }

  /**
   * Cancel current operation in session
   */
  async cancelOperation(sessionId: string): Promise<void> {
    await this.fetch(`/session/${sessionId}/cancel`, {
      method: "POST",
    });
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.fetch(`/session/${sessionId}`, {
      method: "DELETE",
    });
  }
}

/**
 * Create an OpenCode client for a specific sandbox
 */
export function createOpenCodeClient(sandboxPreviewUrl: string): OpenCodeClient {
  return new OpenCodeClient(sandboxPreviewUrl);
}

export { OpenCodeClient };
