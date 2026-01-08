import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, gitConnections } from "@/db";
import { eq, and } from "drizzle-orm";
import { isValidProvider } from "@/features/git-providers/lib/oauth-config";
import { listBranches } from "@/features/git-providers/lib/github";

// GET /api/git/[provider]/branches?owner=xxx&repo=xxx - List branches for a repository
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  // Get query params
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner and repo are required" },
      { status: 400 }
    );
  }

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get connection
    const connection = await db.query.gitConnections.findFirst({
      where: and(
        eq(gitConnections.userId, session.user.id),
        eq(gitConnections.provider, provider)
      ),
    });

    if (!connection) {
      return NextResponse.json(
        { error: `${provider} is not connected` },
        { status: 400 }
      );
    }

    if (provider === "github") {
      const branches = await listBranches(connection.accessToken, owner, repo);

      return NextResponse.json({
        branches: branches.map((branch) => ({
          name: branch.name,
          sha: branch.commit.sha,
          protected: branch.protected,
        })),
      });
    }

    // TODO: Implement GitLab and Bitbucket
    return NextResponse.json(
      { error: `${provider} branches not implemented yet` },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error fetching branches:", error);
    return NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 }
    );
  }
}
