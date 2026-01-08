import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, featureSessions, repositories } from "@/db";
import { eq, desc } from "drizzle-orm";
import { generateId, branchNameFromTitle } from "@/lib/id";

// GET /api/sessions - List sessions for the active organization
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    const repositoryId = request.nextUrl.searchParams.get("repositoryId");

    const query = repositoryId
      ? db
          .select()
          .from(featureSessions)
          .where(eq(featureSessions.repositoryId, repositoryId))
          .orderBy(desc(featureSessions.updatedAt))
      : db
          .select()
          .from(featureSessions)
          .where(eq(featureSessions.organizationId, organizationId))
          .orderBy(desc(featureSessions.updatedAt));

    const sessions = await query;

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { repositoryId, name } = body;

    if (!repositoryId || !name) {
      return NextResponse.json(
        { error: "repositoryId and name are required" },
        { status: 400 }
      );
    }

    // Verify repository belongs to the organization
    const repo = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, repositoryId))
      .limit(1);

    if (!repo[0] || repo[0].organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    const newSession = {
      id: generateId("sess"),
      organizationId,
      repositoryId,
      name,
      branchName: branchNameFromTitle(name),
      status: "idle" as const,
      createdById: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(featureSessions).values(newSession);

    return NextResponse.json({ session: newSession }, { status: 201 });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
