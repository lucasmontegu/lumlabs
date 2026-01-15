/**
 * Daytona Sandbox Provider
 *
 * Wraps the existing Daytona client to implement the SandboxProvider interface.
 */

import { Daytona, type Sandbox } from "@daytonaio/sdk";
import * as fs from "fs/promises";
import * as path from "path";
import type {
  SandboxProvider,
  SandboxWorkspace,
  CreateSandboxOptions,
  CommandResult,
  CodeExecutionEvent,
  FileInfo,
} from "./types";

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

// Path to the coding agent script
const CODING_AGENT_PATH = path.join(
  process.cwd(),
  "sandbox-scripts/coding-agent.ts"
);

class DaytonaSandboxProvider implements SandboxProvider {
  readonly type = "daytona" as const;
  readonly name = "Daytona";

  private sandboxes = new Map<string, Sandbox>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private contexts = new Map<string, any>();

  isAvailable(): boolean {
    return !!process.env.DAYTONA_API_KEY;
  }

  async createWorkspace(options: CreateSandboxOptions): Promise<SandboxWorkspace> {
    const daytona = getDaytona();

    const sandbox = await daytona.create({
      language: "typescript",
      envVars: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
        WORKSPACE_DIR: "/workspace/repo",
        ...options.envVars,
      },
    });

    this.sandboxes.set(sandbox.id, sandbox);

    try {
      // Install Claude Agent SDK
      console.log(`[Daytona ${sandbox.id}] Installing Claude Agent SDK...`);
      await sandbox.process.executeCommand(
        "npm install @anthropic-ai/claude-agent-sdk typescript ts-node @types/node"
      );

      // Clone repository
      console.log(`[Daytona ${sandbox.id}] Cloning repository: ${options.repoUrl}`);
      const cloneCmd = options.gitToken
        ? `git clone https://${options.gitToken}@${options.repoUrl.replace("https://", "")} /workspace/repo`
        : `git clone ${options.repoUrl} /workspace/repo`;

      await sandbox.process.executeCommand(cloneCmd);

      // Checkout branch
      if (options.branch && options.branch !== "main" && options.branch !== "master") {
        await sandbox.process.executeCommand(
          `cd /workspace/repo && git checkout ${options.branch}`
        );
      }

      // Install dependencies
      console.log(`[Daytona ${sandbox.id}] Installing project dependencies...`);
      await sandbox.process.executeCommand(
        "cd /workspace/repo && npm install || yarn install || pnpm install || true"
      );

      // Upload coding agent
      try {
        const agentCode = await fs.readFile(CODING_AGENT_PATH, "utf-8");
        await sandbox.fs.uploadFile(agentCode, "/workspace/coding_agent.ts");
      } catch (err) {
        console.warn(`[Daytona ${sandbox.id}] Could not upload agent file:`, err);
      }

      // Initialize code interpreter
      const ctx = await sandbox.codeInterpreter.createContext();
      this.contexts.set(sandbox.id, ctx);

      await sandbox.codeInterpreter.runCode(
        `import * as codingAgent from '/workspace/coding_agent';`,
        { context: ctx }
      );

      const previewLink = await sandbox.getPreviewLink(3000);

      return {
        id: sandbox.id,
        status: "running",
        previewUrl: previewLink.url,
        provider: "daytona",
        contextId: ctx.id,
      };
    } catch (error) {
      await sandbox.delete().catch(() => {});
      this.sandboxes.delete(sandbox.id);
      throw error;
    }
  }

  async getWorkspace(workspaceId: string): Promise<SandboxWorkspace | null> {
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
        provider: "daytona",
        contextId: ctx?.id,
      };
    } catch {
      return null;
    }
  }

  async resumeWorkspace(workspaceId: string): Promise<SandboxWorkspace> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
      this.sandboxes.set(workspaceId, sandbox);
    }

    const state = String(sandbox.state).toLowerCase();
    const isRunning = state === "running" || state === "started";

    if (!isRunning) {
      console.log(`[Daytona] Starting sandbox ${workspaceId} (current state: ${state})`);
      await sandbox.start();
    }

    const ctx = await sandbox.codeInterpreter.createContext();
    this.contexts.set(workspaceId, ctx);

    try {
      await sandbox.codeInterpreter.runCode(
        `import * as codingAgent from '/workspace/coding_agent';`,
        { context: ctx }
      );
    } catch (err) {
      console.warn(`[Daytona] Could not import coding agent:`, err);
    }

    const previewLink = await sandbox.getPreviewLink(3000);

    return {
      id: sandbox.id,
      status: "running",
      previewUrl: previewLink.url,
      provider: "daytona",
      contextId: ctx.id,
    };
  }

  async pauseWorkspace(workspaceId: string): Promise<void> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
    }

    await sandbox.stop();
    this.contexts.delete(workspaceId);
  }

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

  async executeCommand(
    workspaceId: string,
    command: string,
    options?: {
      cwd?: string;
      envVars?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<CommandResult> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
      this.sandboxes.set(workspaceId, sandbox);
    }

    const fullCommand = options?.cwd ? `cd ${options.cwd} && ${command}` : command;

    const result = await sandbox.process.executeCommand(fullCommand) as {
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

  async *runCode(
    workspaceId: string,
    code: string,
    options?: {
      language?: string;
      envVars?: Record<string, string>;
      onStdout?: (output: string) => void;
      onStderr?: (output: string) => void;
    }
  ): AsyncGenerator<CodeExecutionEvent> {
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
    }

    const messageQueue: CodeExecutionEvent[] = [];
    let isComplete = false;
    let error: Error | null = null;

    const runPromise = sandbox.codeInterpreter.runCode(code, {
      context: ctx,
      envs: options?.envVars,
      onStdout: (msg) => {
        if (msg.output) {
          options?.onStdout?.(msg.output);
          messageQueue.push({
            type: "stdout",
            content: msg.output,
          });
        }
      },
      onStderr: (msg) => {
        if (msg.output) {
          options?.onStderr?.(msg.output);
          messageQueue.push({
            type: "stderr",
            content: msg.output,
          });
        }
      },
    });

    runPromise
      .then(() => {
        isComplete = true;
      })
      .catch((err) => {
        error = err;
        isComplete = true;
      });

    while (!isComplete || messageQueue.length > 0) {
      if (messageQueue.length > 0) {
        yield messageQueue.shift()!;
      } else {
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
      content: "Execution completed",
    };
  }

  async startDevServer(
    workspaceId: string,
    options?: {
      command?: string;
      port?: number;
    }
  ): Promise<string> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
      this.sandboxes.set(workspaceId, sandbox);
    }

    const port = options?.port || 3000;
    const devCommands = options?.command
      ? [options.command]
      : ["npm run dev", "yarn dev", "pnpm dev", "npm start"];

    for (const cmd of devCommands) {
      try {
        await sandbox.process.executeCommand(
          `cd /workspace/repo && nohup ${cmd} > /tmp/dev-server.log 2>&1 &`
        );

        await new Promise((resolve) => setTimeout(resolve, 3000));
        const previewLink = await sandbox.getPreviewLink(port);
        return previewLink.url;
      } catch {
        continue;
      }
    }

    throw new Error("Could not start dev server");
  }

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

  async readFile(workspaceId: string, filePath: string): Promise<string> {
    const result = await this.executeCommand(workspaceId, `cat ${filePath}`);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to read file: ${result.stderr}`);
    }
    return result.stdout;
  }

  async writeFile(workspaceId: string, filePath: string, content: string): Promise<void> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
      this.sandboxes.set(workspaceId, sandbox);
    }

    await sandbox.fs.uploadFile(content, filePath);
  }

  async listFiles(workspaceId: string, dirPath: string): Promise<FileInfo[]> {
    const result = await this.executeCommand(
      workspaceId,
      `ls -la ${dirPath} | tail -n +2`
    );

    if (result.exitCode !== 0) {
      throw new Error(`Failed to list files: ${result.stderr}`);
    }

    const files: FileInfo[] = [];
    const lines = result.stdout.split("\n").filter(Boolean);

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 9) {
        const permissions = parts[0];
        const name = parts.slice(8).join(" ");
        const isDir = permissions.startsWith("d");

        files.push({
          path: `${dirPath}/${name}`.replace(/\/+/g, "/"),
          type: isDir ? "directory" : "file",
          size: parseInt(parts[4]) || undefined,
        });
      }
    }

    return files;
  }

  async createCheckpoint(workspaceId: string, label: string): Promise<string> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
      this.sandboxes.set(workspaceId, sandbox);
    }

    const snapshotFn = sandbox.snapshot as ((label: string) => Promise<{ id: string }>) | undefined;
    if (!snapshotFn) {
      throw new Error("Snapshot feature not available for this sandbox");
    }

    const snapshot = await snapshotFn(label);
    return snapshot.id;
  }

  async restoreCheckpoint(workspaceId: string, snapshotId: string): Promise<void> {
    const daytona = getDaytona();
    let sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      sandbox = await daytona.get(workspaceId);
      this.sandboxes.set(workspaceId, sandbox);
    }

    const restoreFn = (sandbox as unknown as { restore?: (id: string) => Promise<void> }).restore;
    if (!restoreFn) {
      throw new Error("Restore feature not available for this sandbox");
    }

    await restoreFn(snapshotId);

    const ctx = await sandbox.codeInterpreter.createContext();
    this.contexts.set(workspaceId, ctx);

    await sandbox.codeInterpreter.runCode(
      `import * as codingAgent from '/workspace/coding_agent';`,
      { context: ctx }
    );
  }
}

export const daytonaSandboxProvider = new DaytonaSandboxProvider();
