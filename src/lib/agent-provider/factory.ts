/**
 * Agent Provider Factory
 *
 * Creates and manages agent providers based on configuration.
 * Allows runtime switching between providers.
 */

import type { AgentProvider, AgentProviderType } from "./types";
import { openCodeProvider } from "./opencode-provider";
import { claudeAgentProvider } from "./claude-agent-provider";
import { claudeAgentV2Provider } from "./claude-agent-v2-provider";

/**
 * Provider configuration
 */
export interface AgentProviderConfig {
  /**
   * Default provider to use
   */
  defaultProvider: AgentProviderType;

  /**
   * Provider-specific configuration
   */
  providers?: {
    opencode?: {
      enabled: boolean;
    };
    "claude-agent-sdk"?: {
      enabled: boolean;
    };
    "claude-agent-sdk-v2"?: {
      enabled: boolean;
    };
  };
}

/**
 * Default configuration - uses environment variable or falls back to claude-agent-sdk
 * Note: claude-agent-sdk runs inside Daytona sandbox (has access to repo files)
 * Note: claude-agent-sdk-v2 runs locally (no access to sandbox files)
 */
const defaultConfig: AgentProviderConfig = {
  defaultProvider: (process.env.AGENT_PROVIDER as AgentProviderType) || "claude-agent-sdk",
  providers: {
    opencode: { enabled: true },
    "claude-agent-sdk": { enabled: true },
    "claude-agent-sdk-v2": { enabled: true },
  },
};

// Current active configuration
let activeConfig: AgentProviderConfig = defaultConfig;

/**
 * Provider registry
 */
const providers: Record<AgentProviderType, AgentProvider> = {
  opencode: openCodeProvider,
  "claude-agent-sdk": claudeAgentProvider,
  "claude-agent-sdk-v2": claudeAgentV2Provider,
};

/**
 * Set the agent provider configuration
 */
export function setAgentProviderConfig(config: Partial<AgentProviderConfig>): void {
  activeConfig = {
    ...activeConfig,
    ...config,
    providers: {
      ...activeConfig.providers,
      ...config.providers,
    },
  };
}

/**
 * Get the current configuration
 */
export function getAgentProviderConfig(): AgentProviderConfig {
  return { ...activeConfig };
}

/**
 * Get the default agent provider
 */
export function getDefaultProvider(): AgentProvider {
  return getProvider(activeConfig.defaultProvider);
}

/**
 * Get a specific agent provider by type
 * @throws Error if provider is not available or disabled
 */
export function getProvider(type: AgentProviderType): AgentProvider {
  const provider = providers[type];

  if (!provider) {
    throw new Error(`Unknown agent provider: ${type}`);
  }

  const providerConfig = activeConfig.providers?.[type];
  if (providerConfig && !providerConfig.enabled) {
    throw new Error(`Agent provider ${type} is disabled`);
  }

  return provider;
}

/**
 * Get all available (enabled) providers
 */
export function getAvailableProviders(): AgentProvider[] {
  return Object.entries(providers)
    .filter(([type]) => {
      const config = activeConfig.providers?.[type as AgentProviderType];
      return !config || config.enabled;
    })
    .map(([, provider]) => provider);
}

/**
 * Check if a provider is available
 */
export function isProviderAvailable(type: AgentProviderType): boolean {
  const provider = providers[type];
  if (!provider) return false;

  const config = activeConfig.providers?.[type];
  return !config || config.enabled;
}

/**
 * Switch the default provider
 */
export function setDefaultProvider(type: AgentProviderType): void {
  if (!isProviderAvailable(type)) {
    throw new Error(`Cannot set default provider to ${type}: provider not available`);
  }
  activeConfig.defaultProvider = type;
}
