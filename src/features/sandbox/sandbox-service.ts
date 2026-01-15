/**
 * Sandbox Service
 *
 * Manages sandbox lifecycle for sessions with auto-provisioning.
 * Ensures every session has a working sandbox when needed.
 *
 * Now uses the SandboxProvider factory to support multiple providers:
 * - Daytona (default): Persistent sandboxes with pause/resume
 * - E2B: Fast ephemeral sandboxes
 * - Modal: GPU-capable serverless containers
 */

import { db, sandboxes, featureSessions, repositories, gitConnections } from "@/db";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/id";
import {
  getDefaultSandboxProvider,
  getSandboxProvider,
  type SandboxProviderType,
} from "@/lib/sandbox-provider";

export interface SandboxWithWorkspace {
  id: string;
  repositoryId: string;
  daytonaWorkspaceId: string; // Legacy name, actually provider workspace ID
  status: string;
  provider?: SandboxProviderType;
}

export interface GetOrCreateSandboxResult {
  sandbox: SandboxWithWorkspace;
  created: boolean;
}

export interface GetOrCreateSandboxOptions {
  /** Override the default sandbox provider */
  provider?: SandboxProviderType;
}

/**
 * Get or create a sandbox for a session.
 *
 * Flow:
 * 1. Check if session already has a linked sandbox with valid workspace
 * 2. If not, check if repository has an existing sandbox
 * 3. If repository has sandbox, link it to session
 * 4. If no sandbox exists, create one via the selected provider and link to session
 *
 * @param sessionId - The session ID
 * @param organizationId - The organization ID
 * @param userId - Optional user ID for git token lookup
 * @param options - Optional configuration including provider override
 */
export async function getOrCreateSandboxForSession(
  sessionId: string,
  organizationId: string,
  userId?: string,
  options?: GetOrCreateSandboxOptions
): Promise<GetOrCreateSandboxResult> {
  // Step 1: Get session with sandbox and repository info
  const sessionResult = await db
    .select({
      session: featureSessions,
      sandbox: sandboxes,
      repository: repositories,
    })
    .from(featureSessions)
    .leftJoin(sandboxes, eq(featureSessions.sandboxId, sandboxes.id))
    .innerJoin(repositories, eq(featureSessions.repositoryId, repositories.id))
    .where(
      and(
        eq(featureSessions.id, sessionId),
        eq(featureSessions.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!sessionResult[0]) {
    throw new Error("Session not found");
  }

  const { sandbox, repository } = sessionResult[0];

  // Step 2: If session already has a valid sandbox, return it
  if (sandbox && sandbox.daytonaWorkspaceId) {
    return {
      sandbox: {
        id: sandbox.id,
        repositoryId: sandbox.repositoryId,
        daytonaWorkspaceId: sandbox.daytonaWorkspaceId,
        status: sandbox.status,
        provider: (sandbox.provider as SandboxProviderType) || "daytona",
      },
      created: false,
    };
  }

  // Step 3: Check if repository already has a sandbox
  const existingSandbox = await db
    .select()
    .from(sandboxes)
    .where(eq(sandboxes.repositoryId, repository.id))
    .limit(1);

  if (existingSandbox[0] && existingSandbox[0].daytonaWorkspaceId) {
    // Link existing sandbox to session
    await db
      .update(featureSessions)
      .set({
        sandboxId: existingSandbox[0].id,
        updatedAt: new Date(),
      })
      .where(eq(featureSessions.id, sessionId));

    return {
      sandbox: {
        id: existingSandbox[0].id,
        repositoryId: existingSandbox[0].repositoryId,
        daytonaWorkspaceId: existingSandbox[0].daytonaWorkspaceId,
        status: existingSandbox[0].status,
        provider: (existingSandbox[0].provider as SandboxProviderType) || "daytona",
      },
      created: false,
    };
  }

  // Step 4: Create new sandbox via selected provider
  const providerType = options?.provider || "daytona";
  const provider = options?.provider
    ? getSandboxProvider(options.provider)
    : getDefaultSandboxProvider();

  console.log(`[SandboxService] Creating new sandbox for session ${sessionId} using ${provider.name}`);

  // Get git token for private repos if available
  let gitToken: string | undefined;
  if (userId) {
    const gitConnection = await db
      .select()
      .from(gitConnections)
      .where(
        and(
          eq(gitConnections.userId, userId),
          eq(gitConnections.provider, repository.provider)
        )
      )
      .limit(1);

    if (gitConnection[0]) {
      gitToken = gitConnection[0].accessToken;
    }
  }

  // Create workspace using the provider
  const workspace = await provider.createWorkspace({
    repoUrl: repository.url,
    branch: repository.defaultBranch || "main",
    gitToken,
  });

  // Create sandbox record
  const newSandboxId = generateId("sbx");
  const newSandbox = {
    id: newSandboxId,
    repositoryId: repository.id,
    daytonaWorkspaceId: workspace.id, // Stores provider workspace ID
    status: workspace.status,
    provider: providerType,
    lastActiveAt: new Date(),
    createdAt: new Date(),
  };

  await db.insert(sandboxes).values(newSandbox);

  // Link sandbox to session
  await db
    .update(featureSessions)
    .set({
      sandboxId: newSandboxId,
      updatedAt: new Date(),
    })
    .where(eq(featureSessions.id, sessionId));

  console.log(
    `[SandboxService] Created sandbox ${newSandboxId} with ${provider.name} workspace ${workspace.id}`
  );

  return {
    sandbox: {
      id: newSandboxId,
      repositoryId: repository.id,
      daytonaWorkspaceId: workspace.id,
      status: workspace.status,
      provider: providerType,
    },
    created: true,
  };
}

/**
 * Ensure sandbox is running. Resume if paused.
 *
 * NOTE: We can't call getWorkspace() first because it tries to get the preview URL,
 * which fails for paused sandboxes with "no IP address found" error.
 * Instead, we always try to resume - the provider will handle if already running.
 *
 * @param sandboxId - Database sandbox ID
 * @param providerWorkspaceId - Provider-specific workspace ID
 * @param providerType - Optional provider type (defaults to daytona)
 */
export async function ensureSandboxRunning(
  sandboxId: string,
  providerWorkspaceId: string,
  providerType?: SandboxProviderType
): Promise<void> {
  const provider = providerType
    ? getSandboxProvider(providerType)
    : getDefaultSandboxProvider();

  try {
    // Always try to resume - provider handles if already running
    console.log(`[SandboxService] Ensuring sandbox ${sandboxId} is running using ${provider.name}...`);
    await provider.resumeWorkspace(providerWorkspaceId);

    // Update sandbox status in database
    await db
      .update(sandboxes)
      .set({
        status: "running",
        lastActiveAt: new Date(),
      })
      .where(eq(sandboxes.id, sandboxId));

    console.log(`[SandboxService] Sandbox ${sandboxId} is now running`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // If sandbox is already running, that's fine - not an error
    if (errorMessage.includes("already running") || errorMessage.includes("already started")) {
      console.log(`[SandboxService] Sandbox ${sandboxId} was already running`);
      return;
    }

    // E2B and Modal are ephemeral - they can't be resumed
    if (errorMessage.includes("ephemeral") || errorMessage.includes("cannot be resumed")) {
      console.warn(`[SandboxService] ${provider.name} sandbox cannot be resumed - may need recreation`);
      throw new Error(`Sandbox expired. Please create a new session.`);
    }

    // Re-throw other errors
    console.error(`[SandboxService] Failed to ensure sandbox running:`, error);
    throw new Error(`Failed to start sandbox: ${errorMessage}`);
  }
}

/**
 * Update sandbox last active timestamp
 */
export async function touchSandbox(sandboxId: string): Promise<void> {
  await db
    .update(sandboxes)
    .set({
      lastActiveAt: new Date(),
    })
    .where(eq(sandboxes.id, sandboxId));
}
