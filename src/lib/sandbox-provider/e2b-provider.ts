/**
 * E2B Sandbox Provider
 *
 * Uses E2B's code interpreter sandbox for AI-powered code execution.
 * E2B provides secure, isolated cloud sandboxes optimized for AI agents.
 */

import type {
  SandboxProvider,
  SandboxWorkspace,
  CreateSandboxOptions,
  CommandResult,
  CodeExecutionEvent,
  FileInfo,
} from "./types";

// Dynamic import to avoid issues when E2B is not installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SandboxClass: any = null;

async function getSandboxClass() {
  if (!SandboxClass) {
    try {
      // Dynamic import - the package may not be installed
      const module = await import("@e2b/code-interpreter" as string);
      SandboxClass = module.Sandbox;
    } catch {
      throw new Error("@e2b/code-interpreter package is not installed");
    }
  }
  return SandboxClass;
}

// Use any type for sandbox since package may not be installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type E2BSandbox = any;

class E2BSandboxProvider implements SandboxProvider {
  readonly type = "e2b" as const;
  readonly name = "E2B";

  private sandboxes = new Map<string, E2BSandbox>();

  isAvailable(): boolean {
    return !!process.env.E2B_API_KEY;
  }

  async createWorkspace(options: CreateSandboxOptions): Promise<SandboxWorkspace> {
    const Sandbox = await getSandboxClass();

    // Create sandbox with timeout (default 30 minutes)
    const sandbox = await Sandbox.create({
      timeout: options.timeout || 30 * 60 * 1000,
      envs: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
        WORKSPACE_DIR: "/home/user/repo",
        ...options.envVars,
      },
    });

    this.sandboxes.set(sandbox.sandboxId, sandbox);

    try {
      // Clone repository
      console.log(`[E2B ${sandbox.sandboxId}] Cloning repository: ${options.repoUrl}`);
      const cloneCmd = options.gitToken
        ? `git clone https://${options.gitToken}@${options.repoUrl.replace("https://", "")} /home/user/repo`
        : `git clone ${options.repoUrl} /home/user/repo`;

      await sandbox.commands.run(cloneCmd);

      // Checkout branch
      if (options.branch && options.branch !== "main" && options.branch !== "master") {
        await sandbox.commands.run(`cd /home/user/repo && git checkout ${options.branch}`);
      }

      // Detect package manager and install dependencies
      console.log(`[E2B ${sandbox.sandboxId}] Installing project dependencies...`);
      const packageManagers = [
        { check: "test -f /home/user/repo/pnpm-lock.yaml", install: "cd /home/user/repo && pnpm install" },
        { check: "test -f /home/user/repo/yarn.lock", install: "cd /home/user/repo && yarn install" },
        { check: "test -f /home/user/repo/package-lock.json", install: "cd /home/user/repo && npm install" },
        { check: "test -f /home/user/repo/package.json", install: "cd /home/user/repo && npm install" },
      ];

      for (const pm of packageManagers) {
        try {
          const checkResult = await sandbox.commands.run(pm.check);
          if (checkResult.exitCode === 0) {
            await sandbox.commands.run(pm.install);
            break;
          }
        } catch {
          continue;
        }
      }

      // Get the host URL for port 3000
      const previewUrl = `https://${sandbox.getHost(3000)}`;

      return {
        id: sandbox.sandboxId,
        status: "running",
        previewUrl,
        provider: "e2b",
      };
    } catch (error) {
      await sandbox.kill().catch(() => {});
      this.sandboxes.delete(sandbox.sandboxId);
      throw error;
    }
  }

  async getWorkspace(workspaceId: string): Promise<SandboxWorkspace | null> {
    const sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      // E2B sandboxes can't be retrieved after they're lost from memory
      // They need to be recreated
      return null;
    }

    try {
      const previewUrl = `https://${sandbox.getHost(3000)}`;
      return {
        id: sandbox.sandboxId,
        status: "running",
        previewUrl,
        provider: "e2b",
      };
    } catch {
      return null;
    }
  }

  async resumeWorkspace(workspaceId: string): Promise<SandboxWorkspace> {
    // E2B doesn't support pause/resume - sandboxes are ephemeral
    // If sandbox exists in memory, return it; otherwise throw
    const sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      throw new Error("E2B sandbox not found. E2B sandboxes are ephemeral and cannot be resumed after being lost.");
    }

    const previewUrl = `https://${sandbox.getHost(3000)}`;

    return {
      id: sandbox.sandboxId,
      status: "running",
      previewUrl,
      provider: "e2b",
    };
  }

  async pauseWorkspace(workspaceId: string): Promise<void> {
    // E2B doesn't support pausing - we can only kill
    console.warn(`[E2B] Pause not supported - sandbox ${workspaceId} will remain running until timeout or deletion`);
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const sandbox = this.sandboxes.get(workspaceId);

    if (sandbox) {
      await sandbox.kill();
      this.sandboxes.delete(workspaceId);
    }
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
    const sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      throw new Error("E2B sandbox not found");
    }

    const fullCommand = options?.cwd ? `cd ${options.cwd} && ${command}` : command;

    const result = await sandbox.commands.run(fullCommand, {
      envs: options?.envVars,
      timeoutMs: options?.timeout,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
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
    const sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      throw new Error("E2B sandbox not found");
    }

    try {
      // E2B's runCode is for Python by default
      // For TypeScript/JavaScript, we use commands.run
      if (options?.language === "typescript" || options?.language === "javascript") {
        const result = await sandbox.commands.run(`cd /home/user/repo && npx ts-node -e '${code.replace(/'/g, "\\'")}'`);

        if (result.stdout) {
          options?.onStdout?.(result.stdout);
          yield { type: "stdout", content: result.stdout };
        }

        if (result.stderr) {
          options?.onStderr?.(result.stderr);
          yield { type: "stderr", content: result.stderr };
        }

        yield { type: "done", content: "Execution completed" };
      } else {
        // Python execution with streaming
        const execution = await sandbox.runCode(code, {
          envs: options?.envVars,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStdout: (out: any) => {
            options?.onStdout?.(out.line);
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStderr: (out: any) => {
            options?.onStderr?.(out.line);
          },
        });

        if (execution.logs.stdout.length > 0) {
          for (const line of execution.logs.stdout) {
            yield { type: "stdout", content: line };
          }
        }

        if (execution.logs.stderr.length > 0) {
          for (const line of execution.logs.stderr) {
            yield { type: "stderr", content: line };
          }
        }

        if (execution.error) {
          yield { type: "error", content: execution.error.message };
        } else if (execution.text) {
          yield { type: "result", content: execution.text };
        }

        yield { type: "done", content: "Execution completed" };
      }
    } catch (error) {
      yield {
        type: "error",
        content: error instanceof Error ? error.message : String(error),
      };
      yield { type: "done", content: "Execution failed" };
    }
  }

  async startDevServer(
    workspaceId: string,
    options?: {
      command?: string;
      port?: number;
    }
  ): Promise<string> {
    const sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      throw new Error("E2B sandbox not found");
    }

    const port = options?.port || 3000;
    const devCommands = options?.command
      ? [options.command]
      : ["npm run dev", "yarn dev", "pnpm dev", "npm start"];

    for (const cmd of devCommands) {
      try {
        // Start in background
        sandbox.commands.run(`cd /home/user/repo && ${cmd}`, {
          background: true,
        });

        // Wait for server to start
        await new Promise((resolve) => setTimeout(resolve, 5000));

        return `https://${sandbox.getHost(port)}`;
      } catch {
        continue;
      }
    }

    throw new Error("Could not start dev server");
  }

  async getPreviewUrl(workspaceId: string, port = 3000): Promise<string> {
    const sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      throw new Error("E2B sandbox not found");
    }

    return `https://${sandbox.getHost(port)}`;
  }

  async readFile(workspaceId: string, filePath: string): Promise<string> {
    const sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      throw new Error("E2B sandbox not found");
    }

    return await sandbox.files.read(filePath);
  }

  async writeFile(workspaceId: string, filePath: string, content: string): Promise<void> {
    const sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      throw new Error("E2B sandbox not found");
    }

    await sandbox.files.write(filePath, content);
  }

  async listFiles(workspaceId: string, dirPath: string): Promise<FileInfo[]> {
    const sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      throw new Error("E2B sandbox not found");
    }

    const files = await sandbox.files.list(dirPath);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return files.map((file: any) => ({
      path: file.path,
      type: file.type === "dir" ? "directory" : "file",
    }));
  }

  // E2B doesn't support native checkpoints - would need custom implementation
  // using file snapshots or git commits
}

export const e2bSandboxProvider = new E2BSandboxProvider();
