/**
 * Agent Feature - Public API
 *
 * Exports Daytona sandbox management and coding agent functionality
 */

export {
  createSandbox,
  pauseSandbox,
  resumeSandbox,
  deleteSandbox,
  getSandboxStatus,
  initializeInterpreter,
  runAgentQuery,
  startDevServer,
  createCheckpoint,
  restoreCheckpoint,
  type SandboxConfig,
  type SandboxInfo,
} from "./daytona-service";

// Agent message types (for typing stream responses)
export type AgentMessageType =
  | "thinking"
  | "plan"
  | "question"
  | "progress"
  | "result"
  | "error"
  | "tool_use"
  | "text";

export interface AgentMessage {
  type: AgentMessageType;
  content: string;
  metadata?: Record<string, unknown>;
}
