/**
 * Daytona SDK Client
 *
 * Uses official @daytonaio/sdk for managing sandboxes with:
 * - Create/start/pause/resume lifecycle
 * - Code interpreter for running Claude Agent SDK
 * - Checkpoint (snapshot) management
 * - File system operations
 */

import { Daytona, type Sandbox } from "@daytonaio/sdk";
import * as fs from "fs/promises";
import * as path from "path";

// Singleton Daytona client
let daytonaInstance: Daytona | null = null;

function getDaytona(): Daytona {
  if (!daytonaInstance) {
    const apiKey = process.env.DAYTONA_API_KEY;
    if (!apiKey) {
      throw new Error("DAYTONA_API_KEY environment variable is not set");
    }
    daytonaInstance = new Daytona({ apiKey });
  }
  return daytonaInstance;
}

// Path to the coding agent script (uploaded to sandbox)
const CODING_AGENT_PATH = path.join(
  process.cwd(),
  "sandbox-scripts/coding-agent.ts"
);

export interface DaytonaWorkspace {
  id: string;
  status: "creating" | "running" | "paused" | "stopped" | "error";
  previewUrl: string;
  contextId?: string; // Code interpreter context ID
}

export interface CreateWorkspaceOptions {
  repoUrl: string;
  branch?: string;
  gitToken?: string; // For private repos
}

export interface AgentStreamEvent {
  type: "message" | "tool_use" | "progress" | "plan" | "question" | "error" | "done";
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Daytona client with Claude Agent SDK support
 */
class DaytonaClient {
  private sandboxes = new Map<string, Sandbox>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private contexts = new Map<string, any>(); // sandboxId -> context object

  /**
   * Create a new sandbox for a session
   */
  async createWorkspace(options: CreateWorkspaceOptions): Promise<DaytonaWorkspace> {
    const daytona = getDaytona();

    // Create sandbox with required environment variables
    const sandbox = await daytona.create({
      language: "typescript",
      envVars: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
        WORKSPACE_DIR: "/workspace/repo",
      },
    });

    this.sandboxes.set(sandbox.id, sandbox);

    try {
      // Install Claude Agent SDK
      console.log(`[Daytona ${sandbox.id}] Installing Claude Agent SDK...`);
      await sandbox.process.executeCommand(
        "npm install @anthropic-ai/claude-agent-sdk typescript ts-node @types/node"
      );

      // Clone the repository
      console.log(`[Daytona ${sandbox.id}] Cloning repository: ${options.repoUrl}`);
      const cloneCmd = options.gitToken
        ? `git clone https://${options.gitToken}@${options.repoUrl.replace("https://", "")} /workspace/repo`
        : `git clone ${options.repoUrl} /workspace/repo`;

      await sandbox.process.executeCommand(cloneCmd);

      // Checkout specific branch if provided
      if (options.branch && options.branch !== "main" && options.branch !== "master") {
        await sandbox.process.executeCommand(
          `cd /workspace/repo && git checkout ${options.branch}`
        );
      }

      // Install project dependencies
      console.log(`[Daytona ${sandbox.id}] Installing project dependencies...`);
      await sandbox.process.executeCommand(
        "cd /workspace/repo && npm install || yarn install || pnpm install || true"
      );

      // Upload the coding agent script
      console.log(`[Daytona ${sandbox.id}] Uploading coding agent...`);
      try {
        const agentCode = await fs.readFile(CODING_AGENT_PATH, "utf-8");
        await sandbox.fs.uploadFile(agentCode, "/workspace/coding_agent.ts");
      } catch (err) {
        console.warn(`[Daytona ${sandbox.id}] Could not upload agent file:`, err);
      }

      // Initialize code interpreter context
      console.log(`[Daytona ${sandbox.id}] Initializing code interpreter...`);
      const ctx = await sandbox.codeInterpreter.createContext();
      this.contexts.set(sandbox.id, ctx);

      // Import the agent module
      await sandbox.codeInterpreter.runCode(
        `import * as codingAgent from '/workspace/coding_agent';`,
        { context: ctx }
      );

      // Get preview URL
      const previewLink = await sandbox.getPreviewLink(3000);

      return {
        id: sandbox.id,
        status: "running",
        previewUrl: previewLink.url,
        contextId: ctx.id,
      };
    } catch (error) {
      // Cleanup on failure
      await sandbox.delete().catch(() => {});
      this.sandboxes.delete(sandbox.id);
      throw error;
    }
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(workspaceId: string): Promise<DaytonaWorkspace | null> {
    try {
      const daytona = getDaytona();
      let sandbox = this.sandboxes.get(workspaceId);

      if (!sandbox) {
        sandbox = await daytona.get(workspaceId);
        this.sandboxes.set(workspaceId, sandbox);
      }

      const previewLink = await sandbox.getPreviewLink(3000);
      const ctx = this.contexts.get(workspaceId);

      return {
        id: sandbox.id,
        status: String(sandbox.state) === "running" ? "running" : "paused",
        previewUrl: previewLink.url,
        contextId: ctx?.id,
      };
    } catch {
      return null;
    }
  }

  /**
   * Resume a paused workspace
   */
  async resumeWorkspace(workspaceId: string): Promise<DaytonaWorkspace> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
      this.sandboxes.set(workspaceId, sandbox);
    }

    await sandbox.start();

    // Reinitialize code interpreter context
    const ctx = await sandbox.codeInterpreter.createContext();
    this.contexts.set(workspaceId, ctx);

    await sandbox.codeInterpreter.runCode(
      `import * as codingAgent from '/workspace/coding_agent';`,
      { context: ctx }
    );

    const previewLink = await sandbox.getPreviewLink(3000);

    return {
      id: sandbox.id,
      status: "running",
      previewUrl: previewLink.url,
      contextId: ctx.id,
    };
  }

  /**
   * Pause a running workspace
   */
  async pauseWorkspace(workspaceId: string): Promise<void> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
    }

    await sandbox.stop();
    this.contexts.delete(workspaceId);
  }

  /**
   * Delete a workspace permanently
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
    }

    await sandbox.delete();
    this.sandboxes.delete(workspaceId);
    this.contexts.delete(workspaceId);
  }

  /**
   * Run agent query with streaming
   */
  async *runAgentQuery(
    workspaceId: string,
    prompt: string
  ): AsyncGenerator<AgentStreamEvent> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
      this.sandboxes.set(workspaceId, sandbox);
    }

    let ctx = this.contexts.get(workspaceId);
    if (!ctx) {
      ctx = await sandbox.codeInterpreter.createContext();
      this.contexts.set(workspaceId, ctx);

      await sandbox.codeInterpreter.runCode(
        `import * as codingAgent from '/workspace/coding_agent';`,
        { context: ctx }
      );
    }

    // Get preview URL
    const previewLink = await sandbox.getPreviewLink(3000);

    // Create a message queue for streaming
    const messageQueue: AgentStreamEvent[] = [];
    let isComplete = false;
    let error: Error | null = null;

    // Run the agent query
    const runPromise = sandbox.codeInterpreter.runCode(
      `await codingAgent.runQuery(
        process.env.PROMPT,
        process.env.WORKSPACE_DIR,
        process.env.PREVIEW_URL
      )`,
      {
        context: ctx,
        envs: {
          PROMPT: prompt,
          WORKSPACE_DIR: "/workspace/repo",
          PREVIEW_URL: previewLink.url,
        },
        onStdout: (msg) => {
          if (msg.output) {
            try {
              // Parse JSON output from agent
              const parsed = JSON.parse(msg.output.trim());
              messageQueue.push({
                type: parsed.type || "message",
                content: parsed.content || msg.output,
                metadata: parsed.metadata,
              });
            } catch {
              // Plain text output
              messageQueue.push({
                type: "message",
                content: msg.output,
              });
            }
          }
        },
        onStderr: (msg) => {
          if (msg.output) {
            console.error(`[Sandbox ${workspaceId} stderr]`, msg.output);
          }
        },
      }
    );

    runPromise
      .then(() => {
        isComplete = true;
      })
      .catch((err) => {
        error = err;
        isComplete = true;
      });

    // Yield messages as they arrive
    while (!isComplete || messageQueue.length > 0) {
      if (messageQueue.length > 0) {
        yield messageQueue.shift()!;
      } else {
        // Wait a bit for more messages
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    if (error) {
      yield {
        type: "error",
        content: (error as Error).message,
      };
    }

    yield {
      type: "done",
      content: "Query completed",
    };
  }

  /**
   * Start the dev server in the workspace
   */
  async startDevServer(workspaceId: string): Promise<string> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
      this.sandboxes.set(workspaceId, sandbox);
    }

    // Try common dev server commands (run in background)
    const devCommands = ["npm run dev", "yarn dev", "pnpm dev", "npm start"];

    for (const cmd of devCommands) {
      try {
        await sandbox.process.executeCommand(
          `cd /workspace/repo && nohup ${cmd} > /tmp/dev-server.log 2>&1 &`
        );

        // Wait for server to start
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const previewLink = await sandbox.getPreviewLink(3000);
        return previewLink.url;
      } catch {
        continue;
      }
    }

    throw new Error("Could not start dev server");
  }

  /**
   * Get the preview URL for a workspace
   */
  async getPreviewUrl(workspaceId: string, port = 3000): Promise<string> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
      this.sandboxes.set(workspaceId, sandbox);
    }

    const previewLink = await sandbox.getPreviewLink(port);
    return previewLink.url;
  }

  /**
   * Execute a command in the workspace
   */
  async executeCommand(
    workspaceId: string,
    command: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
      this.sandboxes.set(workspaceId, sandbox);
    }

    const result = await sandbox.process.executeCommand(command) as {
      stdout?: string;
      stderr?: string;
      exitCode?: number;
    };

    return {
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      exitCode: result.exitCode || 0,
    };
  }

  /**
   * Create a checkpoint/snapshot
   */
  async createCheckpoint(workspaceId: string, label: string): Promise<string> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
      this.sandboxes.set(workspaceId, sandbox);
    }

    // Type assertion needed due to SDK typings
    const snapshotFn = sandbox.snapshot as ((label: string) => Promise<{ id: string }>) | undefined;
    if (!snapshotFn) {
      throw new Error("Snapshot feature not available for this sandbox");
    }
    const snapshot = await snapshotFn(label);
    return snapshot.id;
  }

  /**
   * Restore from a checkpoint
   */
  async restoreCheckpoint(workspaceId: string, snapshotId: string): Promise<void> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
      this.sandboxes.set(workspaceId, sandbox);
    }

    // Type assertion needed due to SDK typings
    const restoreFn = (sandbox as unknown as { restore?: (id: string) => Promise<void> }).restore;
    if (!restoreFn) {
      throw new Error("Restore feature not available for this sandbox");
    }
    await restoreFn(snapshotId);

    // Reinitialize context after restore
    const ctx = await sandbox.codeInterpreter.createContext();
    this.contexts.set(workspaceId, ctx);

    await sandbox.codeInterpreter.runCode(
      `import * as codingAgent from '/workspace/coding_agent';`,
      { context: ctx }
    );
  }
}

// Export singleton instance
export const daytona = new DaytonaClient();

// Export class for testing/custom instances
export { DaytonaClient };

// Legacy type exports for backwards compatibility
export type DaytonaCheckpoint = {
  id: string;
  workspaceId: string;
  label: string;
  createdAt: string;
};

export type CreateWorkspaceOptionsLegacy = CreateWorkspaceOptions;
export type ExecuteCommandOptions = {
  workspaceId: string;
  command: string;
  cwd?: string;
  timeout?: number;
};
export type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};
