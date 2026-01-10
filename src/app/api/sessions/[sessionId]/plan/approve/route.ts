import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, featureSessions, approvals, messages } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import { generateId } from "@/lib/id";

type RouteParams = { params: Promise<{ sessionId: string }> };

// POST /api/sessions/[sessionId]/plan/approve - Approve or reject the plan
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

    // Verify session belongs to org
    const featureSession = await db
      .select()
      .from(featureSessions)
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

    // Check session is in plan_review status
    if (featureSession[0].status !== "plan_review") {
      return NextResponse.json(
        { error: `Session is not in plan_review status (current: ${featureSession[0].status})` },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { action, comment } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Find the pending approval for this session
    const pendingApproval = await db
      .select()
      .from(approvals)
      .where(
        and(
          eq(approvals.sessionId, sessionId),
          eq(approvals.status, "pending")
        )
      )
      .orderBy(desc(approvals.createdAt))
      .limit(1);

    if (!pendingApproval[0]) {
      return NextResponse.json(
        { error: "No pending approval found for this session" },
        { status: 404 }
      );
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const newSessionStatus = action === "approve" ? "building" : "idle";

    // Update the approval
    await db
      .update(approvals)
      .set({
        status: newStatus,
        reviewerId: session.user.id,
        comment: comment || null,
        reviewedAt: new Date(),
      })
      .where(eq(approvals.id, pendingApproval[0].id));

    // Update session status
    await db
      .update(featureSessions)
      .set({ status: newSessionStatus, updatedAt: new Date() })
      .where(eq(featureSessions.id, sessionId));

    // Add a system message about the approval/rejection
    const messageId = generateId("msg");
    const messageContent =
      action === "approve"
        ? `Plan approved${comment ? `: "${comment}"` : ". Starting build..."}`
        : `Plan rejected${comment ? `: "${comment}"` : ". Please submit a new request."}`;

    await db.insert(messages).values({
      id: messageId,
      sessionId,
      userId: session.user.id,
      role: "system",
      content: messageContent,
      phase: "planning",
      metadata: {
        type: action === "approve" ? "plan_approved" : "plan_rejected",
        approvalId: pendingApproval[0].id,
      },
      createdAt: new Date(),
    });

    return NextResponse.json({
      approval: {
        id: pendingApproval[0].id,
        status: newStatus,
        reviewerId: session.user.id,
        comment: comment || null,
        reviewedAt: new Date(),
      },
      sessionStatus: newSessionStatus,
    });
  } catch (error) {
    console.error("Error processing plan approval:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
