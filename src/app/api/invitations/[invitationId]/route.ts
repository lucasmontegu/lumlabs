import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invitations, members } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invitationId } = await params;

    // Get the invitation
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.id, invitationId),
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to cancel
    const membership = await db.query.members.findFirst({
      where: and(
        eq(members.organizationId, invitation.organizationId),
        eq(members.userId, session.user.id)
      ),
    });

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json(
        { error: "You don't have permission to cancel this invitation" },
        { status: 403 }
      );
    }

    // Delete the invitation
    await db.delete(invitations).where(eq(invitations.id, invitationId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel invitation:", error);
    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await params;

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.id, invitationId),
      with: {
        organizations: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation is no longer valid" },
        { status: 400 }
      );
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organization: invitation.organizations,
      },
    });
  } catch (error) {
    console.error("Failed to get invitation:", error);
    return NextResponse.json(
      { error: "Failed to get invitation" },
      { status: 500 }
    );
  }
}
