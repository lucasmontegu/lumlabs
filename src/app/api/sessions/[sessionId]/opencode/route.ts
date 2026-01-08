import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, featureSessions, sandboxes } from "@/db";
import { eq, and } from "drizzle-orm";
import { createOpenCodeClient } from "@/lib/opencode";
import { daytona } from "@/lib/daytona";

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
        { error: "No OpenCode session initialized" },
        { status: 404 }
      );
    }

    // Get preview URL from Daytona
    const previewUrl = await daytona.getPreviewUrl(sandbox.daytonaWorkspaceId);

    // Get OpenCode session status
    const opencode = createOpenCodeClient(previewUrl);
    const opencodeSession = await opencode.getSession(fs.opencodeSessionId);

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

    const { sandbox } = featureSession[0];

    if (!sandbox || !sandbox.daytonaWorkspaceId) {
      return NextResponse.json(
        { error: "No sandbox available for this session" },
        { status: 400 }
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
        { error: "No sandbox available" },
        { status: 400 }
      );
    }

    if (!fs.opencodeSessionId) {
      return NextResponse.json(
        { error: "No OpenCode session to delete" },
        { status: 404 }
      );
    }

    // Get preview URL from Daytona
    const previewUrl = await daytona.getPreviewUrl(sandbox.daytonaWorkspaceId);

    // Delete OpenCode session
    const opencode = createOpenCodeClient(previewUrl);
    await opencode.deleteSession(fs.opencodeSessionId);

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
