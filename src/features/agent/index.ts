/**
 * Agent Feature - Public API
 *
 * Exports Daytona sandbox management, coding agent, and orchestration functionality.
 * This is the main entry point for AI agent operations.
 */

// Daytona Sandbox Management
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

// Claude Agent for plan generation (legacy)
export {
  generatePlan,
  streamBuildProgress,
  type PlanResult,
  type AgentContext,
} from "./claude-agent";

// Agent Orchestrator (new v2 flow)
export {
  AgentOrchestrator,
  createOrchestrator,
  type OrchestrationContext,
  type OrchestrationPhase,
  type StreamEvent,
  type PlanData,
  type RepoContext,
} from "./orchestrator";

// Agent message types (for typing stream responses)
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
  | "preview_url"
  | "phase_change"
  | "done";

export interface AgentMessage {
  type: AgentMessageType;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}
