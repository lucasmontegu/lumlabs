/**
 * Agent Provider Module
 *
 * Provider-agnostic AI agent abstraction layer.
 * Supports switching between OpenCode and Claude Agent SDK.
 *
 * Usage:
 *   import { getDefaultProvider, getProvider } from "@/lib/agent-provider";
 *
 *   // Use default provider (from config/env)
 *   const provider = getDefaultProvider();
 *
 *   // Or use specific provider
 *   const claudeProvider = getProvider("claude-agent-sdk");
 *
 *   // Create session and send messages
 *   const session = await provider.createSession({ ... });
 *   for await (const event of provider.sendMessage({ ... })) {
 *     console.log(event);
 *   }
 */

// Types
export type {
  AgentProvider,
  AgentProviderType,
  AgentSession,
  AgentStreamEvent,
  AgentEventType,
  CreateAgentSessionOptions,
  SendAgentMessageOptions,
} from "./types";

// Factory functions
export {
  getDefaultProvider,
  getProvider,
  getAvailableProviders,
  isProviderAvailable,
  setDefaultProvider,
  setAgentProviderConfig,
  getAgentProviderConfig,
  type AgentProviderConfig,
} from "./factory";

// Provider implementations (for direct access if needed)
export { openCodeProvider, OpenCodeProvider } from "./opencode-provider";
export { claudeAgentProvider, ClaudeAgentProvider } from "./claude-agent-provider";
