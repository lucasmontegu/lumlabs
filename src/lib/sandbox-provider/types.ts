/**
 * Sandbox Provider Types
 *
 * Common interfaces for cloud sandbox providers (Daytona, E2B, Modal)
 * Allows switching between providers without changing consumer code.
 */

/**
 * Supported sandbox provider types
 */
export type SandboxProviderType = "daytona" | "e2b" | "modal";

/**
 * Sandbox status
 */
export type SandboxStatus = "creating" | "running" | "paused" | "stopped" | "error";

/**
 * Configuration for creating a sandbox
 */
export interface CreateSandboxOptions {
  /** Repository URL to clone */
  repoUrl: string;
  /** Branch to checkout */
  branch?: string;
  /** Git token for private repos */
  gitToken?: string;
  /** Environment variables to set */
  envVars?: Record<string, string>;
  /** Timeout in milliseconds for sandbox creation */
  timeout?: number;
}

/**
 * Sandbox workspace information
 */
export interface SandboxWorkspace {
  /** Provider-specific workspace ID */
  id: string;
  /** Current status */
  status: SandboxStatus;
  /** Preview URL for the running app */
  previewUrl: string;
  /** Provider type */
  provider: SandboxProviderType;
  /** Code interpreter context ID (if available) */
  contextId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Command execution result
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * File info
 */
export interface FileInfo {
  path: string;
  type: "file" | "directory";
  size?: number;
}

/**
 * Stream event from code execution
 */
export interface CodeExecutionEvent {
  type: "stdout" | "stderr" | "result" | "error" | "done";
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Sandbox provider interface
 * All providers must implement this interface
 */
export interface SandboxProvider {
  /**
   * Provider type identifier
   */
  readonly type: SandboxProviderType;

  /**
   * Provider display name
   */
  readonly name: string;

  /**
   * Check if this provider is available (has required env vars)
   */
  isAvailable(): boolean;

  /**
   * Create a new sandbox workspace
   */
  createWorkspace(options: CreateSandboxOptions): Promise<SandboxWorkspace>;

  /**
   * Get workspace by ID
   */
  getWorkspace(workspaceId: string): Promise<SandboxWorkspace | null>;

  /**
   * Resume a paused workspace
   */
  resumeWorkspace(workspaceId: string): Promise<SandboxWorkspace>;

  /**
   * Pause a running workspace (to save costs)
   */
  pauseWorkspace(workspaceId: string): Promise<void>;

  /**
   * Delete a workspace permanently
   */
  deleteWorkspace(workspaceId: string): Promise<void>;

  /**
   * Execute a shell command in the workspace
   */
  executeCommand(
    workspaceId: string,
    command: string,
    options?: {
      cwd?: string;
      envVars?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<CommandResult>;

  /**
   * Run code with streaming output (for agent queries)
   */
  runCode(
    workspaceId: string,
    code: string,
    options?: {
      language?: string;
      envVars?: Record<string, string>;
      onStdout?: (output: string) => void;
      onStderr?: (output: string) => void;
    }
  ): AsyncGenerator<CodeExecutionEvent>;

  /**
   * Start the dev server in the workspace
   */
  startDevServer(
    workspaceId: string,
    options?: {
      command?: string;
      port?: number;
    }
  ): Promise<string>;

  /**
   * Get the preview URL for a specific port
   */
  getPreviewUrl(workspaceId: string, port?: number): Promise<string>;

  /**
   * Read a file from the workspace
   */
  readFile(workspaceId: string, path: string): Promise<string>;

  /**
   * Write a file to the workspace
   */
  writeFile(workspaceId: string, path: string, content: string): Promise<void>;

  /**
   * List files in a directory
   */
  listFiles(workspaceId: string, path: string): Promise<FileInfo[]>;

  /**
   * Create a checkpoint/snapshot (if supported)
   */
  createCheckpoint?(workspaceId: string, label: string): Promise<string>;

  /**
   * Restore from a checkpoint (if supported)
   */
  restoreCheckpoint?(workspaceId: string, snapshotId: string): Promise<void>;
}
