import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, gitConnections } from "@/db";
import { eq, and } from "drizzle-orm";
import { isValidProvider } from "@/features/git-providers/lib/oauth-config";
import { listRepositories } from "@/features/git-providers/lib/github";

// GET /api/git/[provider]/repos - List repositories from the provider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
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

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);

    let repos;

    if (provider === "github") {
      // For GitHub, fetch all repos and filter client-side for better UX
      const allRepos = await listRepositories(connection.accessToken, {
        sort: "updated",
        direction: "desc",
        per_page: 100,
        page,
        type: "all",
      });

      // Filter by search if provided
      repos = search
        ? allRepos.filter(
            (repo) =>
              repo.name.toLowerCase().includes(search.toLowerCase()) ||
              repo.full_name.toLowerCase().includes(search.toLowerCase())
          )
        : allRepos;

      // Transform to unified format
      return NextResponse.json({
        repositories: repos.map((repo) => ({
          id: String(repo.id),
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
          description: repo.description,
          url: repo.html_url,
          cloneUrl: repo.clone_url,
          defaultBranch: repo.default_branch,
          owner: repo.owner.login,
          ownerAvatar: repo.owner.avatar_url,
          updatedAt: repo.updated_at,
          language: repo.language,
        })),
      });
    }

    // TODO: Implement GitLab and Bitbucket
    return NextResponse.json(
      { error: `${provider} repos not implemented yet` },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
