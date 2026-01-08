import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, sandboxes, repositories } from "@/db";
import { eq, and } from "drizzle-orm";
import { daytona } from "@/lib/daytona";

type RouteParams = { params: Promise<{ sandboxId: string }> };

// POST /api/sandboxes/[sandboxId]/pause - Pause a running sandbox
export async function POST(_request: NextRequest, { params }: RouteParams) {
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

    // Get sandbox with repository to verify ownership
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

    if (!result[0].sandbox.daytonaWorkspaceId) {
      return NextResponse.json(
        { error: "Sandbox has no Daytona workspace" },
        { status: 400 }
      );
    }

    // Pause Daytona workspace
    const workspace = await daytona.pauseWorkspace(
      result[0].sandbox.daytonaWorkspaceId
    );

    // Update sandbox status
    await db
      .update(sandboxes)
      .set({ status: workspace.status })
      .where(eq(sandboxes.id, sandboxId));

    return NextResponse.json({
      sandbox: {
        ...result[0].sandbox,
        status: workspace.status,
      },
    });
  } catch (error) {
    console.error("Error pausing sandbox:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
