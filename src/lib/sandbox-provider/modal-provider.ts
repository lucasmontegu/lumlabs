/**
 * Modal Sandbox Provider
 *
 * Uses Modal's serverless sandboxes for cloud code execution.
 * Modal provides lightweight, fast-starting containers with GPU support.
 */

import type {
  SandboxProvider,
  SandboxWorkspace,
  CreateSandboxOptions,
  CommandResult,
  CodeExecutionEvent,
  FileInfo,
} from "./types";

// Types for Modal SDK
interface ModalSandbox {
  sandboxId: string;
  stdin: {
    writeText(text: string): Promise<void>;
    close(): Promise<void>;
  };
  stdout: {
    readText(): Promise<string>;
  };
  stderr: {
    readText(): Promise<string>;
  };
  runCommand(
    cmd: string[],
    opts?: { stdout?: "pipe"; stderr?: "pipe" }
  ): Promise<{
    stdout: { readText(): Promise<string> };
    stderr: { readText(): Promise<string> };
    wait(): Promise<number>;
  }>;
  terminate(): Promise<void>;
}

interface ModalClient {
  apps: {
    fromName(name: string, opts: { createIfMissing: boolean }): Promise<unknown>;
  };
  images: {
    fromRegistry(image: string): unknown;
  };
  sandboxes: {
    create(app: unknown, image: unknown, opts?: { command?: string[] }): Promise<ModalSandbox>;
  };
}

// Dynamic import for Modal
let ModalClientClass: { new (): ModalClient } | null = null;

async function getModalClient(): Promise<ModalClient> {
  if (!ModalClientClass) {
    try {
      const module = await import("modal" as string) as { ModalClient: { new (): ModalClient } };
      ModalClientClass = module.ModalClient;
    } catch {
      throw new Error("modal package is not installed");
    }
  }
  return new ModalClientClass();
}

class ModalSandboxProvider implements SandboxProvider {
  readonly type = "modal" as const;
  readonly name = "Modal";

  private sandboxes = new Map<string, ModalSandbox>();
  private clients = new Map<string, ModalClient>();

  isAvailable(): boolean {
    // Modal uses MODAL_TOKEN_ID and MODAL_TOKEN_SECRET
    return !!process.env.MODAL_TOKEN_ID && !!process.env.MODAL_TOKEN_SECRET;
  }

  async createWorkspace(options: CreateSandboxOptions): Promise<SandboxWorkspace> {
    const client = await getModalClient();

    // Get or create app namespace
    const app = await client.apps.fromName("vibecodesandbox", {
      createIfMissing: true,
    });

    // Use a Node.js image for JavaScript/TypeScript projects
    const image = client.images.fromRegistry("node:20-slim");

    // Create sandbox with a shell command
    const sandbox = await client.sandboxes.create(app, image, {
      command: ["bash"],
    });

    this.sandboxes.set(sandbox.sandboxId, sandbox);
    this.clients.set(sandbox.sandboxId, client);

    try {
      // Set up the environment by running commands via stdin
      const setupCommands = [
        "apt-get update && apt-get install -y git curl",
        "npm install -g pnpm yarn typescript ts-node",
      ];

      // Clone repository - use validated URL
      const repoUrlParsed = new URL(options.repoUrl);
      const safeRepoUrl = options.gitToken
        ? `https://${options.gitToken}@${repoUrlParsed.host}${repoUrlParsed.pathname}`
        : options.repoUrl;

      setupCommands.push(`git clone ${safeRepoUrl} /workspace/repo`);

      // Checkout branch - validate branch name
      if (options.branch && options.branch !== "main" && options.branch !== "master") {
        const safeBranch = options.branch.replace(/[^a-zA-Z0-9_\-./]/g, "");
        setupCommands.push(`cd /workspace/repo && git checkout ${safeBranch}`);
      }

      // Install dependencies
      setupCommands.push("cd /workspace/repo && npm install || yarn install || pnpm install || true");

      // Run setup commands using Modal's command execution
      for (const cmd of setupCommands) {
        console.log(`[Modal ${sandbox.sandboxId}] Running: ${cmd.substring(0, 50)}...`);
        await sandbox.stdin.writeText(cmd + "\n");
      }

      // Note: Modal sandboxes don't have built-in preview URLs
      // We would need to set up a tunnel or use Modal's built-in web endpoint feature
      const previewUrl = `https://modal-sandbox-${sandbox.sandboxId}.modal.run`;

      return {
        id: sandbox.sandboxId,
        status: "running",
        previewUrl,
        provider: "modal",
        metadata: {
          note: "Modal sandboxes require additional setup for web preview",
        },
      };
    } catch (error) {
      await sandbox.terminate().catch(() => {});
      this.sandboxes.delete(sandbox.sandboxId);
      this.clients.delete(sandbox.sandboxId);
      throw error;
    }
  }

  async getWorkspace(workspaceId: string): Promise<SandboxWorkspace | null> {
    const sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      return null;
    }

    return {
      id: sandbox.sandboxId,
      status: "running",
      previewUrl: `https://modal-sandbox-${sandbox.sandboxId}.modal.run`,
      provider: "modal",
    };
  }

  async resumeWorkspace(workspaceId: string): Promise<SandboxWorkspace> {
    const sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      throw new Error("Modal sandbox not found. Modal sandboxes are ephemeral and cannot be resumed.");
    }

    return {
      id: sandbox.sandboxId,
      status: "running",
      previewUrl: `https://modal-sandbox-${sandbox.sandboxId}.modal.run`,
      provider: "modal",
    };
  }

  async pauseWorkspace(workspaceId: string): Promise<void> {
    console.warn(`[Modal] Pause not supported - sandbox ${workspaceId} will remain running until termination`);
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const sandbox = this.sandboxes.get(workspaceId);

    if (sandbox) {
      await sandbox.terminate();
      this.sandboxes.delete(workspaceId);
      this.clients.delete(workspaceId);
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
      throw new Error("Modal sandbox not found");
    }

    // Build command with optional cwd
    const cmdArgs = options?.cwd
      ? ["bash", "-c", `cd ${options.cwd} && ${command}`]
      : ["bash", "-c", command];

    // Execute command using Modal's runCommand
    const process = await sandbox.runCommand(cmdArgs, {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      process.stdout.readText(),
      process.stderr.readText(),
    ]);

    const exitCode = await process.wait();

    return {
      stdout,
      stderr,
      exitCode,
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
      throw new Error("Modal sandbox not found");
    }

    try {
      let cmdArgs: string[];

      if (options?.language === "typescript") {
        // Write code to temp file and execute to avoid shell escaping issues
        const tempFile = `/tmp/code_${Date.now()}.ts`;
        await this.writeFile(workspaceId, tempFile, code);
        cmdArgs = ["bash", "-c", `cd /workspace/repo && npx ts-node ${tempFile}`];
      } else if (options?.language === "javascript") {
        const tempFile = `/tmp/code_${Date.now()}.js`;
        await this.writeFile(workspaceId, tempFile, code);
        cmdArgs = ["bash", "-c", `cd /workspace/repo && node ${tempFile}`];
      } else {
        // Default to Python
        cmdArgs = ["python", "-c", code];
      }

      const process = await sandbox.runCommand(cmdArgs, {
        stdout: "pipe",
        stderr: "pipe",
      });

      const [stdout, stderr] = await Promise.all([
        process.stdout.readText(),
        process.stderr.readText(),
      ]);

      if (stdout) {
        options?.onStdout?.(stdout);
        yield { type: "stdout", content: stdout };
      }

      if (stderr) {
        options?.onStderr?.(stderr);
        yield { type: "stderr", content: stderr };
      }

      const exitCode = await process.wait();

      if (exitCode !== 0) {
        yield { type: "error", content: `Process exited with code ${exitCode}` };
      }

      yield { type: "done", content: "Execution completed" };
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
      throw new Error("Modal sandbox not found");
    }

    const devCommands = options?.command
      ? [options.command]
      : ["npm run dev", "yarn dev", "pnpm dev", "npm start"];

    for (const cmd of devCommands) {
      try {
        // Start server in background via stdin
        await sandbox.stdin.writeText(`cd /workspace/repo && nohup ${cmd} &\n`);

        // Wait for server to start
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Modal doesn't have built-in port forwarding like Daytona/E2B
        // Would need ngrok or similar for public URLs
        return `https://modal-sandbox-${sandbox.sandboxId}.modal.run`;
      } catch {
        continue;
      }
    }

    throw new Error("Could not start dev server");
  }

  async getPreviewUrl(workspaceId: string, port = 3000): Promise<string> {
    const sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      throw new Error("Modal sandbox not found");
    }

    // Modal requires additional setup for web endpoints
    // This is a placeholder URL
    return `https://modal-sandbox-${sandbox.sandboxId}.modal.run:${port}`;
  }

  async readFile(workspaceId: string, filePath: string): Promise<string> {
    const result = await this.executeCommand(workspaceId, `cat "${filePath}"`);

    if (result.exitCode !== 0) {
      throw new Error(`Failed to read file: ${result.stderr}`);
    }

    return result.stdout;
  }

  async writeFile(workspaceId: string, filePath: string, content: string): Promise<void> {
    const sandbox = this.sandboxes.get(workspaceId);

    if (!sandbox) {
      throw new Error("Modal sandbox not found");
    }

    // Write file using heredoc with unique delimiter
    const delimiter = `MODALEOF_${Date.now()}`;
    await sandbox.stdin.writeText(`cat > "${filePath}" << '${delimiter}'\n${content}\n${delimiter}\n`);
  }

  async listFiles(workspaceId: string, dirPath: string): Promise<FileInfo[]> {
    const result = await this.executeCommand(
      workspaceId,
      `ls -la "${dirPath}" | tail -n +2`
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

  // Modal doesn't support native checkpoints
}

export const modalSandboxProvider = new ModalSandboxProvider();
