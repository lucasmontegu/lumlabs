import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, sandboxes, repositories } from "@/db";
import { eq, and } from "drizzle-orm";
import { daytona } from "@/lib/daytona";

type RouteParams = { params: Promise<{ sandboxId: string }> };

// GET /api/sandboxes/[sandboxId] - Get sandbox status
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

    // Get live status from Daytona if workspace ID exists
    let liveStatus = result[0].sandbox.status;
    let previewUrl: string | undefined;

    if (result[0].sandbox.daytonaWorkspaceId) {
      try {
        const workspace = await daytona.getWorkspace(
          result[0].sandbox.daytonaWorkspaceId
        );
        liveStatus = workspace.status;
        previewUrl = workspace.previewUrl;

        // Update status in DB if changed
        if (workspace.status !== result[0].sandbox.status) {
          await db
            .update(sandboxes)
            .set({ status: workspace.status })
            .where(eq(sandboxes.id, sandboxId));
        }
      } catch {
        // Daytona API might be unavailable, use cached status
      }
    }

    return NextResponse.json({
      sandbox: {
        ...result[0].sandbox,
        status: liveStatus,
        previewUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching sandbox:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/sandboxes/[sandboxId] - Delete sandbox
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    // Delete Daytona workspace
    if (result[0].sandbox.daytonaWorkspaceId) {
      try {
        await daytona.deleteWorkspace(result[0].sandbox.daytonaWorkspaceId);
      } catch {
        // Continue even if Daytona delete fails
      }
    }

    // Delete sandbox record
    await db.delete(sandboxes).where(eq(sandboxes.id, sandboxId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sandbox:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
