import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, sandboxes, repositories, checkpoints, featureSessions } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import { generateId } from "@/lib/id";
import { daytona } from "@/lib/daytona";

type RouteParams = { params: Promise<{ sandboxId: string }> };

// GET /api/sandboxes/[sandboxId]/checkpoints - List checkpoints
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sandboxId } = await params;
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Verify sandbox ownership
    const result = await db
      .select({
        sandbox: sandboxes,
        repository: repositories,
      })
      .from(sandboxes)
      .innerJoin(repositories, eq(sandboxes.repositoryId, repositories.id))
      .where(
        and(
          eq(sandboxes.id, sandboxId),
          eq(repositories.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!result[0]) {
      return NextResponse.json({ error: "Sandbox not found" }, { status: 404 });
    }

    // Get checkpoints for this sandbox
    const checkpointList = await db
      .select()
      .from(checkpoints)
      .where(eq(checkpoints.sandboxId, sandboxId))
      .orderBy(desc(checkpoints.createdAt));

    return NextResponse.json({ checkpoints: checkpointList });
  } catch (error) {
    console.error("Error fetching checkpoints:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/sandboxes/[sandboxId]/checkpoints - Create a checkpoint
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sandboxId } = await params;
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { label, sessionId, type = "manual" } = body;

    if (!label) {
      return NextResponse.json(
        { error: "label is required" },
        { status: 400 }
      );
    }

    // Verify sandbox ownership
    const result = await db
      .select({
        sandbox: sandboxes,
        repository: repositories,
      })
      .from(sandboxes)
      .innerJoin(repositories, eq(sandboxes.repositoryId, repositories.id))
      .where(
        and(
          eq(sandboxes.id, sandboxId),
          eq(repositories.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!result[0]) {
      return NextResponse.json({ error: "Sandbox not found" }, { status: 404 });
    }

    // Verify session if provided
    if (sessionId) {
      const sessionResult = await db
        .select()
        .from(featureSessions)
        .where(
          and(
            eq(featureSessions.id, sessionId),
            eq(featureSessions.sandboxId, sandboxId)
          )
        )
        .limit(1);

      if (!sessionResult[0]) {
        return NextResponse.json(
          { error: "Session not found or does not belong to this sandbox" },
          { status: 404 }
        );
      }
    }

    // Create Daytona checkpoint
    let daytonaCheckpointId: string | undefined;
    if (result[0].sandbox.daytonaWorkspaceId) {
      try {
        const daytonaCheckpoint = await daytona.createCheckpoint(
          result[0].sandbox.daytonaWorkspaceId,
          label
        );
        daytonaCheckpointId = daytonaCheckpoint.id;
      } catch (error) {
        console.error("Failed to create Daytona checkpoint:", error);
        // Continue without Daytona checkpoint
      }
    }

    // Create checkpoint record
    const newCheckpoint = {
      id: generateId("chk"),
      sessionId: sessionId || null,
      sandboxId,
      label,
      type,
      daytonaCheckpointId: daytonaCheckpointId || null,
      createdAt: new Date(),
    };

    await db.insert(checkpoints).values(newCheckpoint);

    // Update sandbox last checkpoint
    await db
      .update(sandboxes)
      .set({ lastCheckpointId: newCheckpoint.id })
      .where(eq(sandboxes.id, sandboxId));

    return NextResponse.json({ checkpoint: newCheckpoint }, { status: 201 });
  } catch (error) {
    console.error("Error creating checkpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
