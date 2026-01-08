/**
 * Daytona SDK Client
 *
 * Wraps the Daytona API for managing pausable workspaces with:
 * - Create/start/pause/resume lifecycle
 * - Checkpoint (snapshot) management
 * - Process execution for running commands
 */

const DAYTONA_API_URL = process.env.DAYTONA_API_URL || "https://api.daytona.io";
const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY || "";

export interface DaytonaWorkspace {
  id: string;
  name: string;
  status: "creating" | "running" | "paused" | "stopped" | "error";
  previewUrl?: string;
  createdAt: string;
  lastActiveAt?: string;
}

export interface DaytonaCheckpoint {
  id: string;
  workspaceId: string;
  label: string;
  createdAt: string;
}

export interface CreateWorkspaceOptions {
  name: string;
  repoUrl: string;
  branch?: string;
  envVars?: Record<string, string>;
}

export interface ExecuteCommandOptions {
  workspaceId: string;
  command: string;
  cwd?: string;
  timeout?: number;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

class DaytonaClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl = DAYTONA_API_URL, apiKey = DAYTONA_API_KEY) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Daytona API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Create a new workspace from a repository
   */
  async createWorkspace(options: CreateWorkspaceOptions): Promise<DaytonaWorkspace> {
    return this.fetch<DaytonaWorkspace>("/workspaces", {
      method: "POST",
      body: JSON.stringify({
        name: options.name,
        repository: {
          url: options.repoUrl,
          branch: options.branch || "main",
        },
        envVars: options.envVars || {},
      }),
    });
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(workspaceId: string): Promise<DaytonaWorkspace> {
    return this.fetch<DaytonaWorkspace>(`/workspaces/${workspaceId}`);
  }

  /**
   * Resume a paused workspace
   */
  async resumeWorkspace(workspaceId: string): Promise<DaytonaWorkspace> {
    return this.fetch<DaytonaWorkspace>(`/workspaces/${workspaceId}/resume`, {
      method: "POST",
    });
  }

  /**
   * Pause a running workspace (preserves state, stops billing)
   */
  async pauseWorkspace(workspaceId: string): Promise<DaytonaWorkspace> {
    return this.fetch<DaytonaWorkspace>(`/workspaces/${workspaceId}/pause`, {
      method: "POST",
    });
  }

  /**
   * Stop and delete a workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.fetch(`/workspaces/${workspaceId}`, {
      method: "DELETE",
    });
  }

  /**
   * Create a checkpoint (snapshot) of the workspace
   */
  async createCheckpoint(
    workspaceId: string,
    label: string
  ): Promise<DaytonaCheckpoint> {
    return this.fetch<DaytonaCheckpoint>(
      `/workspaces/${workspaceId}/checkpoints`,
      {
        method: "POST",
        body: JSON.stringify({ label }),
      }
    );
  }

  /**
   * List all checkpoints for a workspace
   */
  async listCheckpoints(workspaceId: string): Promise<DaytonaCheckpoint[]> {
    return this.fetch<DaytonaCheckpoint[]>(
      `/workspaces/${workspaceId}/checkpoints`
    );
  }

  /**
   * Restore workspace to a checkpoint
   */
  async restoreCheckpoint(
    workspaceId: string,
    checkpointId: string
  ): Promise<DaytonaWorkspace> {
    return this.fetch<DaytonaWorkspace>(
      `/workspaces/${workspaceId}/checkpoints/${checkpointId}/restore`,
      {
        method: "POST",
      }
    );
  }

  /**
   * Execute a command in the workspace
   */
  async executeCommand(options: ExecuteCommandOptions): Promise<CommandResult> {
    return this.fetch<CommandResult>(
      `/workspaces/${options.workspaceId}/exec`,
      {
        method: "POST",
        body: JSON.stringify({
          command: options.command,
          cwd: options.cwd,
          timeout: options.timeout || 30000,
        }),
      }
    );
  }

  /**
   * Get the preview URL for a workspace (dev server)
   */
  async getPreviewUrl(workspaceId: string, port = 3000): Promise<string> {
    const workspace = await this.getWorkspace(workspaceId);
    // Daytona provides preview URLs in format: https://{port}-{workspaceId}.daytona.work
    return `https://${port}-${workspaceId}.daytona.work`;
  }

  /**
   * Start the dev server in the workspace
   */
  async startDevServer(
    workspaceId: string,
    command = "npm run dev"
  ): Promise<void> {
    // Run in background (don't wait for completion)
    await this.fetch(`/workspaces/${workspaceId}/exec`, {
      method: "POST",
      body: JSON.stringify({
        command: `nohup ${command} > /tmp/dev-server.log 2>&1 &`,
        background: true,
      }),
    });
  }

  /**
   * Install dependencies in the workspace
   */
  async installDependencies(workspaceId: string): Promise<CommandResult> {
    return this.executeCommand({
      workspaceId,
      command: "npm install",
      timeout: 120000, // 2 minutes for install
    });
  }
}

// Export singleton instance
export const daytona = new DaytonaClient();

// Export class for testing/custom instances
export { DaytonaClient };
