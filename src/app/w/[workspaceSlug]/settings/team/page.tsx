import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organizations, members, users, invitations } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TeamSettings } from "@/features/settings";

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Get organization by slug
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, workspaceSlug),
  });

  if (!org) {
    notFound();
  }

  // Get user's membership to check role
  const membership = await db.query.members.findFirst({
    where: and(
      eq(members.organizationId, org.id),
      eq(members.userId, session.user.id)
    ),
  });

  const isOwner = membership?.role === "owner";
  const isAdmin = membership?.role === "admin" || isOwner;

  // Get all members with user info
  const orgMembers = await db
    .select({
      id: members.id,
      role: members.role,
      createdAt: members.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      },
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(members.organizationId, org.id))
    .orderBy(desc(members.createdAt));

  // Get pending invitations
  const pendingInvitations = await db.query.invitations.findMany({
    where: and(
      eq(invitations.organizationId, org.id),
      eq(invitations.status, "pending")
    ),
    orderBy: desc(invitations.createdAt),
  });

  return (
    <TeamSettings
      organizationId={org.id}
      members={orgMembers.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image || undefined,
        },
      }))}
      invitations={pendingInvitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role || "member",
        status: inv.status,
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
      }))}
      currentUserId={session.user.id}
      isOwner={isOwner}
      isAdmin={isAdmin}
    />
  );
}
