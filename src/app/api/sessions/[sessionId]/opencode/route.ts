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

// GET /api/sessions/[sessionId]/opencode - Get OpenCode session status
export async function GET(_request: NextRequest, { params }: RouteParams) {
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
        { error: "No OpenCode session initialized" },
        { status: 404 }
      );
    }

    // Get preview URL from Daytona
    const previewUrl = await daytona.getPreviewUrl(sandbox.daytonaWorkspaceId);

    // Get OpenCode session status
    const opencode = createOpenCodeClient(previewUrl);
    const opencodeSession = await opencode.getSession(featureSession[0].opencodeSessionId!);

    return NextResponse.json({ opencodeSession });
  } catch (error) {
    console.error("Error fetching OpenCode session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/sessions/[sessionId]/opencode - Initialize OpenCode session
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const { systemPrompt, model, skills } = body;

    // Get preview URL from Daytona
    const previewUrl = await daytona.getPreviewUrl(sandbox.daytonaWorkspaceId);

    // Create OpenCode client and session
    const opencode = createOpenCodeClient(previewUrl);
    const opencodeSession = await opencode.createSession({
      systemPrompt,
      model,
      skills,
    });

    // Save OpenCode session ID
    await db
      .update(featureSessions)
      .set({
        opencodeSessionId: opencodeSession.id,
        updatedAt: new Date(),
      })
      .where(eq(featureSessions.id, sessionId));

    return NextResponse.json({ opencodeSession }, { status: 201 });
  } catch (error) {
    console.error("Error creating OpenCode session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[sessionId]/opencode - Delete OpenCode session
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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
        { error: "No OpenCode session to delete" },
        { status: 404 }
      );
    }

    // Get preview URL from Daytona
    const previewUrl = await daytona.getPreviewUrl(sandbox.daytonaWorkspaceId);

    // Delete OpenCode session
    const opencode = createOpenCodeClient(previewUrl);
    await opencode.deleteSession(featureSession[0].opencodeSessionId);

    // Clear OpenCode session ID
    await db
      .update(featureSessions)
      .set({
        opencodeSessionId: null,
        updatedAt: new Date(),
      })
      .where(eq(featureSessions.id, sessionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting OpenCode session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
