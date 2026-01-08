/**
 * Agent Provider Types
 *
 * Common interfaces for AI agent providers (OpenCode, Claude Agent SDK, etc.)
 * Allows switching between providers without changing consumer code.
 */

/**
 * Supported agent provider types
 */
export type AgentProviderType = "opencode" | "claude-agent-sdk";

/**
 * Configuration for creating an agent session
 */
export interface CreateAgentSessionOptions {
  sandboxId: string;
  workspaceId: string; // Daytona workspace ID
  systemPrompt?: string;
  model?: string;
  skills?: string[];
}

/**
 * Agent session information
 */
export interface AgentSession {
  id: string;
  providerId: string; // Provider-specific session ID (e.g., OpenCode session ID or context ID)
  provider: AgentProviderType;
  status: "idle" | "busy" | "error";
  createdAt: Date;
}

/**
 * Options for sending a message to the agent
 */
export interface SendAgentMessageOptions {
  sessionId: string;
  workspaceId: string;
  content: string;
  previewUrl?: string;
}

/**
 * Event types emitted by the agent during streaming
 */
export type AgentEventType =
  | "start"
  | "message"
  | "plan"
  | "question"
  | "progress"
  | "tool_use"
  | "tool_result"
  | "preview_url"
  | "error"
  | "done";

/**
 * Streaming event from the agent
 */
export interface AgentStreamEvent {
  type: AgentEventType;
  content: string;
  metadata?: Record<string, unknown>;
  messageId?: string;
}

/**
 * Agent provider interface
 * All providers must implement this interface
 */
export interface AgentProvider {
  /**
   * Provider type identifier
   */
  readonly type: AgentProviderType;

  /**
   * Create a new agent session for a sandbox
   */
  createSession(options: CreateAgentSessionOptions): Promise<AgentSession>;

  /**
   * Get session status
   */
  getSession(sessionId: string, workspaceId: string): Promise<AgentSession | null>;

  /**
   * Send a message and stream responses
   */
  sendMessage(
    options: SendAgentMessageOptions
  ): AsyncGenerator<AgentStreamEvent, void, unknown>;

  /**
   * Cancel the current operation
   */
  cancelOperation(sessionId: string, workspaceId: string): Promise<void>;

  /**
   * Delete/cleanup a session
   */
  deleteSession(sessionId: string, workspaceId: string): Promise<void>;
}
