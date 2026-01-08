/**
 * Daytona Service - Manages sandbox lifecycle
 * Creates, pauses, resumes, and deletes Daytona sandboxes
 */

import { Daytona, type Sandbox } from "@daytonaio/sdk";
import * as fs from "fs/promises";
import * as path from "path";

// Daytona client singleton
let daytonaClient: Daytona | null = null;

// Store full context objects (type inferred from createContext())
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const contextStore = new Map<string, any>();

function getDaytonaClient(): Daytona {
  if (!daytonaClient) {
    const apiKey = process.env.DAYTONA_API_KEY;
    if (!apiKey) {
      throw new Error("DAYTONA_API_KEY environment variable is not set");
    }
    daytonaClient = new Daytona({ apiKey });
  }
  return daytonaClient;
}

// Path to the coding agent script (in sandbox-scripts, excluded from Next.js build)
const CODING_AGENT_PATH = path.join(
  process.cwd(),
  "sandbox-scripts/coding-agent.ts"
);

export interface SandboxConfig {
  repoUrl: string;
  branch?: string;
  gitToken?: string; // For private repos
}

export interface SandboxInfo {
  sandboxId: string;
  previewUrl: string;
  status: "running" | "paused" | "deleted";
}

/**
 * Create a new Daytona sandbox for a session
 */
export async function createSandbox(config: SandboxConfig): Promise<SandboxInfo> {
  const daytona = getDaytonaClient();

  // Create sandbox with required environment variables
  const sandbox = await daytona.create({
    language: "typescript",
    envVars: {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
      WORKSPACE_DIR: "/workspace/repo",
      GIT_TOKEN: config.gitToken || "",
    },
  });

  try {
    // Install dependencies
    console.log("[Daytona] Installing Claude Agent SDK...");
    await sandbox.process.executeCommand(
      "npm install @anthropic-ai/claude-agent-sdk"
    );

    // Clone the repository
    console.log(`[Daytona] Cloning repository: ${config.repoUrl}`);
    const cloneCmd = config.gitToken
      ? `git clone https://${config.gitToken}@${config.repoUrl.replace("https://", "")} /workspace/repo`
      : `git clone ${config.repoUrl} /workspace/repo`;

    await sandbox.process.executeCommand(cloneCmd);

    // Checkout specific branch if provided
    if (config.branch && config.branch !== "main" && config.branch !== "master") {
      await sandbox.process.executeCommand(
        `cd /workspace/repo && git checkout ${config.branch}`
      );
    }

    // Install project dependencies
    console.log("[Daytona] Installing project dependencies...");
    await sandbox.process.executeCommand(
      "cd /workspace/repo && npm install || yarn install || pnpm install || true"
    );

    // Upload the coding agent script
    console.log("[Daytona] Uploading coding agent...");
    const agentCode = await fs.readFile(CODING_AGENT_PATH, "utf-8");
    await sandbox.fs.uploadFile(agentCode, "/workspace/coding_agent.ts");

    // Get preview URL (assuming port 3000 for dev server)
    const previewLink = await sandbox.getPreviewLink(3000);

    return {
      sandboxId: sandbox.id,
      previewUrl: previewLink.url,
      status: "running",
    };
  } catch (error) {
    // Cleanup on failure
    await sandbox.delete().catch(() => {});
    throw error;
  }
}

/**
 * Initialize code interpreter context for a sandbox
 */
export async function initializeInterpreter(sandboxId: string): Promise<string> {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.get(sandboxId);

  // Create code interpreter context
  const ctx = await sandbox.codeInterpreter.createContext();

  // Store full context for later use
  contextStore.set(sandboxId, ctx);

  // Initialize the agent module
  await sandbox.codeInterpreter.runCode(
    `import codingAgent from './coding_agent';`,
    { context: ctx }
  );

  return ctx.id;
}

/**
 * Run a query through the coding agent in a sandbox
 */
export async function runAgentQuery(
  sandboxId: string,
  _contextId: string,
  prompt: string,
  onMessage: (message: string) => void
): Promise<void> {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.get(sandboxId);

  // Get stored context or create new one
  let ctx = contextStore.get(sandboxId);
  if (!ctx) {
    ctx = await sandbox.codeInterpreter.createContext();
    contextStore.set(sandboxId, ctx);
    // Initialize the agent module
    await sandbox.codeInterpreter.runCode(
      `import codingAgent from './coding_agent';`,
      { context: ctx }
    );
  }

  await sandbox.codeInterpreter.runCode(
    `await codingAgent.runQuery(process.env.PROMPT, process.env.WORKSPACE_DIR, process.env.PREVIEW_URL)`,
    {
      context: ctx,
      envs: {
        PROMPT: prompt,
        WORKSPACE_DIR: "/workspace/repo",
        PREVIEW_URL: process.env.PREVIEW_URL || "",
      },
      onStdout: (msg) => {
        if (msg.output) {
          onMessage(msg.output);
        }
      },
      onStderr: (msg) => {
        if (msg.output) {
          // Log stderr but don't send to client unless it's an error
          console.error("[Sandbox stderr]", msg.output);
        }
      },
    }
  );
}

/**
 * Start the dev server in the sandbox
 */
export async function startDevServer(sandboxId: string): Promise<string> {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.get(sandboxId);

  // Try common dev server commands
  const devCommands = [
    "npm run dev",
    "yarn dev",
    "pnpm dev",
    "npm start",
    "bun dev",
  ];

  // Start in background (non-blocking)
  for (const cmd of devCommands) {
    try {
      // Run in background with nohup
      await sandbox.process.executeCommand(
        `cd /workspace/repo && nohup ${cmd} > /tmp/dev-server.log 2>&1 &`
      );

      // Wait a bit for server to start
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get preview URL
      const previewLink = await sandbox.getPreviewLink(3000);
      return previewLink.url;
    } catch {
      // Try next command
      continue;
    }
  }

  throw new Error("Could not start dev server");
}

/**
 * Pause a sandbox (stop billing but preserve state)
 */
export async function pauseSandbox(sandboxId: string): Promise<void> {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.get(sandboxId);
  await sandbox.stop();
}

/**
 * Resume a paused sandbox
 */
export async function resumeSandbox(sandboxId: string): Promise<SandboxInfo> {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.get(sandboxId);
  await sandbox.start();

  const previewLink = await sandbox.getPreviewLink(3000);

  return {
    sandboxId: sandbox.id,
    previewUrl: previewLink.url,
    status: "running",
  };
}

/**
 * Delete a sandbox permanently
 */
export async function deleteSandbox(sandboxId: string): Promise<void> {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.get(sandboxId);
  await sandbox.delete();
}

/**
 * Get sandbox status
 */
export async function getSandboxStatus(sandboxId: string): Promise<SandboxInfo | null> {
  try {
    const daytona = getDaytonaClient();
    const sandbox = await daytona.get(sandboxId);

    const previewLink = await sandbox.getPreviewLink(3000);

    // Determine status based on sandbox state
    const status = String(sandbox.state) === "running" ? "running" : "paused";

    return {
      sandboxId: sandbox.id,
      previewUrl: previewLink.url,
      status,
    };
  } catch {
    return null;
  }
}

/**
 * Create a checkpoint/snapshot of the sandbox
 */
export async function createCheckpoint(
  sandboxId: string,
  label: string
): Promise<string> {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.get(sandboxId);

  // Create a snapshot (type assertion needed due to SDK typings)
  const snapshotFn = sandbox.snapshot as ((label: string) => Promise<{ id: string }>) | undefined;
  if (!snapshotFn) {
    throw new Error("Snapshot feature not available for this sandbox");
  }
  const snapshot = await snapshotFn(label);

  return snapshot.id;
}

/**
 * Restore sandbox from a checkpoint
 */
export async function restoreCheckpoint(
  sandboxId: string,
  snapshotId: string
): Promise<void> {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.get(sandboxId);

  // Restore from snapshot (type assertion needed due to SDK typings)
  const restoreFn = (sandbox as unknown as { restore?: (id: string) => Promise<void> }).restore;
  if (!restoreFn) {
    throw new Error("Restore feature not available for this sandbox");
  }
  await restoreFn(snapshotId);
}
