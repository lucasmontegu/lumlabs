import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, gitConnections } from "@/db";
import { eq, and } from "drizzle-orm";
import { isValidProvider } from "@/features/git-providers/lib/oauth-config";

// DELETE /api/git/connections/[provider] - Disconnect a git provider
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider
  if (!isValidProvider(provider)) {
    return NextResponse.json(
      { error: "Invalid provider" },
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

    // Delete the connection
    const result = await db
      .delete(gitConnections)
      .where(
        and(
          eq(gitConnections.userId, session.user.id),
          eq(gitConnections.provider, provider)
        )
      )
      .returning({ id: gitConnections.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting provider:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
