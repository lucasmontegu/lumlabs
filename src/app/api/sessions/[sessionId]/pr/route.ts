/**
 * Pull Request Creation API Endpoint
 *
 * POST /api/sessions/[sessionId]/pr
 *
 * Creates a GitHub PR from the session's branch with changes made during the build.
 * Follows the decision document flow: creates branch, commits changes, creates PR.
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, featureSessions, repositories, gitConnections, messages } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import { daytona } from "@/lib/daytona";
import { generateId } from "@/lib/id";
import {
  getOrCreateSandboxForSession,
  ensureSandboxRunning,
} from "@/features/sandbox";

type RouteParams = { params: Promise<{ sessionId: string }> };

interface PRBody {
  title?: string;
  description?: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { sessionId } = await params;
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "No active organization" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get or create sandbox for this session
    let sandbox;
    try {
      const result = await getOrCreateSandboxForSession(
        sessionId,
        organizationId,
        session.user.id
      );
      sandbox = result.sandbox;
      await ensureSandboxRunning(sandbox.id, sandbox.daytonaWorkspaceId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to provision sandbox";
      if (errorMessage === "Session not found") {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ error: `Sandbox error: ${errorMessage}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get feature session with repository
    const featureSession = await db
      .select({
        session: featureSessions,
        repository: repositories,
      })
      .from(featureSessions)
      .leftJoin(repositories, eq(featureSessions.repositoryId, repositories.id))
      .where(
        and(
          eq(featureSessions.id, sessionId),
          eq(featureSessions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!featureSession[0]) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { session: fs, repository } = featureSession[0];

    if (!repository) {
      return new Response(
        JSON.stringify({ error: "Repository not found" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check that session is in ready status
    if (fs.status !== "ready") {
      return new Response(
        JSON.stringify({
          error: `Cannot create PR in ${fs.status} status. Build must complete first.`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get Git connection for the user
    const gitConnection = await db
      .select()
      .from(gitConnections)
      .where(
        and(
          eq(gitConnections.userId, session.user.id),
          eq(gitConnections.provider, repository.provider)
        )
      )
      .limit(1);

    if (!gitConnection[0]) {
      return new Response(
        JSON.stringify({
          error: `No ${repository.provider} connection found. Please connect your account.`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const body = (await request.json()) as PRBody;

    // Get the latest plan message for PR description
    const planMessage = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.sessionId, sessionId),
          eq(messages.role, "assistant")
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(10);

    const planContent = planMessage.find((m: { content: string }) => {
      try {
        const parsed = JSON.parse(m.content);
        return parsed.summary && parsed.changes;
      } catch {
        return false;
      }
    });

    let planData: { summary?: string; changes?: Array<{ description: string }> } = {};
    if (planContent) {
      try {
        planData = JSON.parse(planContent.content);
      } catch {
        // Ignore parse errors
      }
    }

    // Create branch name based on session
    const branchName = fs.branchName || `lumlabs/session-${sessionId}`;
    const prTitle = body.title || planData.summary || fs.name;
    const baseBranch = repository.defaultBranch || "main";

    // Build PR description
    const prDescription = body.description || buildPRDescription(
      planData,
      sessionId,
      process.env.NEXT_PUBLIC_APP_URL || "https://lumlabs.ai"
    );

    try {
      // Execute git commands in the sandbox to create branch and commit
      const workspaceId = sandbox.daytonaWorkspaceId;

      // 1. Create and checkout the branch
      await daytona.executeCommand(
        workspaceId,
        `cd /workspace/repo && git checkout -b ${branchName} 2>/dev/null || git checkout ${branchName}`
      );

      // 2. Stage all changes
      await daytona.executeCommand(
        workspaceId,
        `cd /workspace/repo && git add -A`
      );

      // 3. Check if there are changes to commit
      const statusResult = await daytona.executeCommand(
        workspaceId,
        `cd /workspace/repo && git status --porcelain`
      );

      if (!statusResult.stdout.trim()) {
        return new Response(
          JSON.stringify({ error: "No changes to commit" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // 4. Commit the changes
      const commitMessage = `${prTitle}\n\nGenerated by LumLabs session: ${sessionId}`;
      await daytona.executeCommand(
        workspaceId,
        `cd /workspace/repo && git commit -m "${commitMessage.replace(/"/g, '\\"')}"`
      );

      // 5. Push to remote
      const token = gitConnection[0].accessToken;
      const repoUrlWithAuth = repository.url.replace(
        "https://",
        `https://${token}@`
      );

      await daytona.executeCommand(
        workspaceId,
        `cd /workspace/repo && git remote set-url origin ${repoUrlWithAuth} && git push -u origin ${branchName}`
      );

      // 6. Create the PR using GitHub API
      const prResponse = await createGitHubPR(
        repository.url,
        gitConnection[0].accessToken,
        {
          title: prTitle,
          body: prDescription,
          head: branchName,
          base: baseBranch,
        }
      );

      // Save message about PR creation
      const messageId = generateId("msg");
      await db.insert(messages).values({
        id: messageId,
        sessionId,
        role: "system",
        content: `Pull request created: ${prResponse.html_url}`,
        metadata: { prUrl: prResponse.html_url, prNumber: prResponse.number },
        createdAt: new Date(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          pr: {
            url: prResponse.html_url,
            number: prResponse.number,
            title: prTitle,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error creating PR:", error);
      return new Response(
        JSON.stringify({
          error: `Failed to create PR: ${error instanceof Error ? error.message : "Unknown error"}`,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error in PR endpoint:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Build PR description from plan data
 */
function buildPRDescription(
  plan: { summary?: string; changes?: Array<{ description: string }> },
  sessionId: string,
  appUrl: string
): string {
  const sections: string[] = [];

  sections.push("## Summary");
  sections.push(plan.summary || "Changes made via LumLabs");
  sections.push("");

  if (plan.changes && plan.changes.length > 0) {
    sections.push("## Changes");
    for (const change of plan.changes) {
      sections.push(`- ${change.description}`);
    }
    sections.push("");
  }

  sections.push("## Session");
  sections.push(`[View in LumLabs](${appUrl}/session/${sessionId})`);
  sections.push("");

  sections.push("---");
  sections.push("*Generated by [LumLabs](https://lumlabs.ai)*");

  return sections.join("\n");
}

/**
 * Create a GitHub PR using the REST API
 */
async function createGitHubPR(
  repoUrl: string,
  token: string,
  options: {
    title: string;
    body: string;
    head: string;
    base: string;
  }
): Promise<{ html_url: string; number: number }> {
  // Parse owner/repo from URL
  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) {
    throw new Error("Invalid GitHub repository URL");
  }

  const [, owner, repo] = match;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `GitHub API error: ${response.status}`);
  }

  return response.json();
}
