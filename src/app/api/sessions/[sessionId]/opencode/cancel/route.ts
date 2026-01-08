import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, featureSessions, sandboxes } from "@/db";
import { eq, and } from "drizzle-orm";
import { createOpenCodeClient } from "@/lib/opencode";
import { daytona } from "@/lib/daytona";

type RouteParams = { params: Promise<{ sessionId: string }> };

// POST /api/sessions/[sessionId]/opencode/cancel - Cancel current OpenCode operation
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Get feature session with sandbox
    const featureSession = await db
      .select({
        session: featureSessions,
        sandbox: sandboxes,
      })
      .from(featureSessions)
      .leftJoin(sandboxes, eq(featureSessions.sandboxId, sandboxes.id))
      .where(
        and(
          eq(featureSessions.id, sessionId),
          eq(featureSessions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!featureSession[0]) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { session: fs, sandbox } = featureSession[0];

    if (!sandbox || !sandbox.daytonaWorkspaceId) {
      return NextResponse.json(
        { error: "No sandbox available for this session" },
        { status: 400 }
      );
    }

    if (!fs.opencodeSessionId) {
      return NextResponse.json(
        { error: "No OpenCode session to cancel" },
        { status: 404 }
      );
    }

    // Get preview URL from Daytona
    const previewUrl = await daytona.getPreviewUrl(sandbox.daytonaWorkspaceId);

    // Cancel OpenCode operation
    const opencode = createOpenCodeClient(previewUrl);
    await opencode.cancelOperation(fs.opencodeSessionId);

    // Update session status
    await db
      .update(featureSessions)
      .set({
        status: "idle",
        updatedAt: new Date(),
      })
      .where(eq(featureSessions.id, sessionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error canceling OpenCode operation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
