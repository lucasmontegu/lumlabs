import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invitations, members, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { InviteAcceptClient } from "./invite-accept-client";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;

  // Get the invitation
  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.id, invitationId),
  });

  if (!invitation) {
    notFound();
  }

  // Check if invitation is still valid
  if (invitation.status !== "pending") {
    return (
      <InviteAcceptClient
        error="This invitation has already been used"
        type="invalid"
      />
    );
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    return (
      <InviteAcceptClient error="This invitation has expired" type="expired" />
    );
  }

  // Get organization
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, invitation.organizationId),
  });

  if (!org) {
    notFound();
  }

  // Check if user is logged in
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // Redirect to login with return URL
    redirect(`/login?redirect=/invite/${invitationId}`);
  }

  // Check if email matches
  if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <InviteAcceptClient
        error={`This invitation was sent to ${invitation.email}. You are logged in as ${session.user.email}.`}
        type="wrong_email"
        invitedEmail={invitation.email}
        currentEmail={session.user.email}
      />
    );
  }

  // Check if already a member
  const existingMembership = await db.query.members.findFirst({
    where: and(
      eq(members.organizationId, org.id),
      eq(members.userId, session.user.id)
    ),
  });

  if (existingMembership) {
    // Already a member, redirect to workspace
    redirect(`/w/${org.slug}`);
  }

  // Accept the invitation
  try {
    // Add user as member
    await db.insert(members).values({
      id: nanoid(),
      organizationId: org.id,
      userId: session.user.id,
      role: invitation.role || "member",
      createdAt: new Date(),
    });

    // Update invitation status
    await db
      .update(invitations)
      .set({ status: "accepted" })
      .where(eq(invitations.id, invitationId));

    // Redirect to the workspace
    redirect(`/w/${org.slug}`);
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return (
      <InviteAcceptClient
        error="Failed to accept invitation. Please try again."
        type="error"
      />
    );
  }
}
