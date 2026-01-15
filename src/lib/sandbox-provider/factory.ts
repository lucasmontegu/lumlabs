/**
 * Sandbox Provider Factory
 *
 * Creates and manages sandbox providers based on configuration.
 * Currently only Daytona is fully integrated. E2B and Modal are planned.
 */

import type { SandboxProvider, SandboxProviderType } from "./types";
import { daytonaSandboxProvider } from "./daytona-provider";

/**
 * Provider configuration
 */
export interface SandboxProviderConfig {
  /**
   * Default provider to use
   */
  defaultProvider: SandboxProviderType;

  /**
   * Provider-specific configuration
   */
  providers?: {
    daytona?: {
      enabled: boolean;
    };
    e2b?: {
      enabled: boolean;
    };
    modal?: {
      enabled: boolean;
    };
  };
}

/**
 * Default configuration - uses environment variable or falls back to daytona
 */
const defaultConfig: SandboxProviderConfig = {
  defaultProvider: (process.env.SANDBOX_PROVIDER as SandboxProviderType) || "daytona",
  providers: {
    daytona: { enabled: true },
    e2b: { enabled: false }, // Disabled until @e2b/code-interpreter is installed
    modal: { enabled: false }, // Disabled until modal is installed
  },
};

// Current active configuration
let activeConfig: SandboxProviderConfig = defaultConfig;

/**
 * Stub provider for E2B (until package is installed)
 */
const e2bStubProvider: SandboxProvider = {
  type: "e2b",
  name: "E2B (Not Installed)",
  isAvailable: () => false,
  createWorkspace: async () => {
    throw new Error("E2B provider not available. Install @e2b/code-interpreter package.");
  },
  getWorkspace: async () => null,
  resumeWorkspace: async () => {
    throw new Error("E2B provider not available");
  },
  pauseWorkspace: async () => {
    throw new Error("E2B provider not available");
  },
  deleteWorkspace: async () => {
    throw new Error("E2B provider not available");
  },
  executeCommand: async () => {
    throw new Error("E2B provider not available");
  },
  runCode: async function* () {
    throw new Error("E2B provider not available");
  },
  startDevServer: async () => {
    throw new Error("E2B provider not available");
  },
  getPreviewUrl: async () => {
    throw new Error("E2B provider not available");
  },
  readFile: async () => {
    throw new Error("E2B provider not available");
  },
  writeFile: async () => {
    throw new Error("E2B provider not available");
  },
  listFiles: async () => {
    throw new Error("E2B provider not available");
  },
};

/**
 * Stub provider for Modal (until package is installed)
 */
const modalStubProvider: SandboxProvider = {
  type: "modal",
  name: "Modal (Not Installed)",
  isAvailable: () => false,
  createWorkspace: async () => {
    throw new Error("Modal provider not available. Install modal package.");
  },
  getWorkspace: async () => null,
  resumeWorkspace: async () => {
    throw new Error("Modal provider not available");
  },
  pauseWorkspace: async () => {
    throw new Error("Modal provider not available");
  },
  deleteWorkspace: async () => {
    throw new Error("Modal provider not available");
  },
  executeCommand: async () => {
    throw new Error("Modal provider not available");
  },
  runCode: async function* () {
    throw new Error("Modal provider not available");
  },
  startDevServer: async () => {
    throw new Error("Modal provider not available");
  },
  getPreviewUrl: async () => {
    throw new Error("Modal provider not available");
  },
  readFile: async () => {
    throw new Error("Modal provider not available");
  },
  writeFile: async () => {
    throw new Error("Modal provider not available");
  },
  listFiles: async () => {
    throw new Error("Modal provider not available");
  },
};

/**
 * Provider registry
 * Note: E2B and Modal use stub providers until their packages are installed
 */
const providers: Record<SandboxProviderType, SandboxProvider> = {
  daytona: daytonaSandboxProvider,
  e2b: e2bStubProvider,
  modal: modalStubProvider,
};

/**
 * Set the sandbox provider configuration
 */
export function setSandboxProviderConfig(config: Partial<SandboxProviderConfig>): void {
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
export function getSandboxProviderConfig(): SandboxProviderConfig {
  return { ...activeConfig };
}

/**
 * Get the default sandbox provider
 */
export function getDefaultSandboxProvider(): SandboxProvider {
  return getSandboxProvider(activeConfig.defaultProvider);
}

/**
 * Get a specific sandbox provider by type
 * @throws Error if provider is not available or disabled
 */
export function getSandboxProvider(type: SandboxProviderType): SandboxProvider {
  const provider = providers[type];

  if (!provider) {
    throw new Error(`Unknown sandbox provider: ${type}`);
  }

  const providerConfig = activeConfig.providers?.[type];
  if (providerConfig && !providerConfig.enabled) {
    throw new Error(`Sandbox provider ${type} is disabled`);
  }

  if (!provider.isAvailable()) {
    throw new Error(`Sandbox provider ${type} is not available. Check required environment variables.`);
  }

  return provider;
}

/**
 * Get all available (enabled and configured) providers
 */
export function getAvailableSandboxProviders(): SandboxProvider[] {
  return Object.entries(providers)
    .filter(([type, provider]) => {
      const config = activeConfig.providers?.[type as SandboxProviderType];
      const enabled = !config || config.enabled;
      return enabled && provider.isAvailable();
    })
    .map(([, provider]) => provider);
}

/**
 * Check if a provider is available
 */
export function isSandboxProviderAvailable(type: SandboxProviderType): boolean {
  const provider = providers[type];
  if (!provider) return false;

  const config = activeConfig.providers?.[type];
  const enabled = !config || config.enabled;

  return enabled && provider.isAvailable();
}

/**
 * Switch the default provider
 */
export function setDefaultSandboxProvider(type: SandboxProviderType): void {
  if (!isSandboxProviderAvailable(type)) {
    throw new Error(`Cannot set default sandbox provider to ${type}: provider not available`);
  }
  activeConfig.defaultProvider = type;
}

/**
 * Get provider info for UI display
 */
export function getSandboxProviderInfo(): Array<{
  type: SandboxProviderType;
  name: string;
  available: boolean;
  isDefault: boolean;
  features: {
    persistent: boolean;
    pauseResume: boolean;
    gpuSupport: boolean;
  };
}> {
  return [
    {
      type: "daytona",
      name: "Daytona",
      available: isSandboxProviderAvailable("daytona"),
      isDefault: activeConfig.defaultProvider === "daytona",
      features: {
        persistent: true,
        pauseResume: true,
        gpuSupport: false,
      },
    },
    {
      type: "e2b",
      name: "E2B",
      available: isSandboxProviderAvailable("e2b"),
      isDefault: activeConfig.defaultProvider === "e2b",
      features: {
        persistent: false,
        pauseResume: false,
        gpuSupport: false,
      },
    },
    {
      type: "modal",
      name: "Modal",
      available: isSandboxProviderAvailable("modal"),
      isDefault: activeConfig.defaultProvider === "modal",
      features: {
        persistent: false,
        pauseResume: false,
        gpuSupport: true,
      },
    },
  ];
}

// Re-export types
export type { SandboxProvider, SandboxProviderType } from "./types";
