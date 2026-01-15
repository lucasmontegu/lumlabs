import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, featureSessions } from "@/db";
import { eq } from "drizzle-orm";
import { createOpenCodeClient } from "@/lib/opencode";
import { daytona } from "@/lib/daytona";
import {
  getOrCreateSandboxForSession,
  ensureSandboxRunning,
} from "@/features/sandbox";

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
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: `Sandbox error: ${errorMessage}` },
        { status: 500 }
      );
    }

    // Get feature session to check for OpenCode session ID
    const featureSession = await db
      .select()
      .from(featureSessions)
      .where(eq(featureSessions.id, sessionId))
      .limit(1);

    if (!featureSession[0]?.opencodeSessionId) {
      return NextResponse.json(
        { error: "No OpenCode session to cancel" },
        { status: 404 }
      );
    }

    // Get preview URL from Daytona
    const previewUrl = await daytona.getPreviewUrl(sandbox.daytonaWorkspaceId);

    // Cancel OpenCode operation
    const opencode = createOpenCodeClient(previewUrl);
    await opencode.cancelOperation(featureSession[0].opencodeSessionId);

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
