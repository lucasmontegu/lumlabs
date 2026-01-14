import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organizations, members } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { OrganizationSettings } from "@/features/settings";

export default async function OrganizationSettingsPage({
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

  return (
    <OrganizationSettings
      organization={{
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo || undefined,
      }}
      isOwner={isOwner}
      isAdmin={isAdmin}
    />
  );
}
