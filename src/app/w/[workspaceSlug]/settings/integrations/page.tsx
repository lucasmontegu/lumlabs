import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organizations, members, gitConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { IntegrationsSettings } from "@/features/settings";

export default async function IntegrationsSettingsPage({
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

  // Get user's git connections
  const connections = await db.query.gitConnections.findMany({
    where: eq(gitConnections.userId, session.user.id),
  });

  return (
    <IntegrationsSettings
      organizationId={org.id}
      gitConnections={connections.map((conn) => ({
        id: conn.id,
        provider: conn.provider,
        username: conn.providerUsername || undefined,
        connectedAt: conn.connectedAt.toISOString(),
      }))}
      isAdmin={isAdmin}
    />
  );
}
