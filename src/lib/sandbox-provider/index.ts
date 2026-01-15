/**
 * Sandbox Provider Module
 *
 * Provides a unified interface for cloud sandbox providers (Daytona, E2B, Modal).
 */

// Factory exports
export {
  getDefaultSandboxProvider,
  getSandboxProvider,
  getAvailableSandboxProviders,
  isSandboxProviderAvailable,
  setDefaultSandboxProvider,
  setSandboxProviderConfig,
  getSandboxProviderConfig,
  getSandboxProviderInfo,
} from "./factory";

// Type exports
export type {
  SandboxProvider,
  SandboxProviderType,
  SandboxProviderConfig,
} from "./factory";

export type {
  SandboxWorkspace,
  SandboxStatus,
  CreateSandboxOptions,
  CommandResult,
  CodeExecutionEvent,
  FileInfo,
} from "./types";

// Provider exports for direct access
// Only Daytona is exported - E2B and Modal require their packages to be installed
export { daytonaSandboxProvider } from "./daytona-provider";
// Note: E2B and Modal providers are available in the factory as stubs
// Install @e2b/code-interpreter or modal packages to enable them
