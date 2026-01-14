import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invitations, members, organizations, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendEmail } from "@/lib/resend";
import { InvitationEmail } from "@/emails/invitation-email";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { organizationId, email, role = "member" } = body;

    if (!organizationId || !email) {
      return NextResponse.json(
        { error: "Organization ID and email are required" },
        { status: 400 }
      );
    }

    // Check if user has permission to invite
    const membership = await db.query.members.findFirst({
      where: and(
        eq(members.organizationId, organizationId),
        eq(members.userId, session.user.id)
      ),
    });

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json(
        { error: "You don't have permission to invite members" },
        { status: 403 }
      );
    }

    // Check if email is already a member
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      const existingMembership = await db.query.members.findFirst({
        where: and(
          eq(members.organizationId, organizationId),
          eq(members.userId, existingUser.id)
        ),
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: "This user is already a member of this organization" },
          { status: 400 }
        );
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.organizationId, organizationId),
        eq(invitations.email, email),
        eq(invitations.status, "pending")
      ),
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "An invitation is already pending for this email" },
        { status: 400 }
      );
    }

    // Get organization info
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Create invitation
    const invitationId = nanoid();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(invitations).values({
      id: invitationId,
      organizationId,
      email,
      role,
      status: "pending",
      expiresAt,
      inviterId: session.user.id,
    });

    // Generate invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/invite/${invitationId}`;

    // Send invitation email
    try {
      await sendEmail({
        to: email,
        subject: `${session.user.name} invited you to join ${org.name}`,
        react: InvitationEmail({
          inviterName: session.user.name,
          organizationName: org.name,
          inviteLink,
          role,
          expiresAt: "7 days",
        }),
      });
    } catch (emailError) {
      // Log error but don't fail the invitation creation
      console.error("Failed to send invitation email:", emailError);
    }

    return NextResponse.json({
      success: true,
      invitationId,
    });
  } catch (error) {
    console.error("Failed to create invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Check if user is a member
    const membership = await db.query.members.findFirst({
      where: and(
        eq(members.organizationId, organizationId),
        eq(members.userId, session.user.id)
      ),
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      );
    }

    const orgInvitations = await db.query.invitations.findMany({
      where: and(
        eq(invitations.organizationId, organizationId),
        eq(invitations.status, "pending")
      ),
    });

    return NextResponse.json({ invitations: orgInvitations });
  } catch (error) {
    console.error("Failed to fetch invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
