import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, gitConnections } from "@/db";
import { eq } from "drizzle-orm";

// GET /api/git/connections - List user's git provider connections
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connections = await db
      .select({
        id: gitConnections.id,
        provider: gitConnections.provider,
        providerUsername: gitConnections.providerUsername,
        connectedAt: gitConnections.connectedAt,
      })
      .from(gitConnections)
      .where(eq(gitConnections.userId, session.user.id));

    // Transform to a map for easier access
    const connectionMap = connections.reduce(
      (acc, conn) => {
        acc[conn.provider] = {
          connected: true,
          username: conn.providerUsername,
          connectedAt: conn.connectedAt,
        };
        return acc;
      },
      {} as Record<
        string,
        { connected: boolean; username: string | null; connectedAt: Date }
      >
    );

    return NextResponse.json({
      connections: connectionMap,
      providers: ["github", "gitlab", "bitbucket"].map((provider) => ({
        provider,
        connected: !!connectionMap[provider],
        username: connectionMap[provider]?.username || null,
        connectedAt: connectionMap[provider]?.connectedAt || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching git connections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
