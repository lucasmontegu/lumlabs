import { db } from "@/db"
import { organizations, members } from "@/db/schema"
import { generateId, slugify } from "@/lib/id"

interface CreateDefaultOrgParams {
  userId: string
  userName: string
}

export async function createDefaultOrganization({
  userId,
  userName,
}: CreateDefaultOrgParams) {
  // Generate org name and slug from user name
  const orgName = `${userName}'s Workspace`
  const baseSlug = slugify(userName || "user")

  // Check if slug exists and make it unique if needed
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.slug, slug),
    })

    if (!existing) break

    slug = `${baseSlug}-${counter}`
    counter++
  }

  const orgId = generateId("org")
  const memberId = generateId("mem")
  const now = new Date()

  // Create the organization
  await db.insert(organizations).values({
    id: orgId,
    name: orgName,
    slug,
    metadata: JSON.stringify({
      plan: "free",
      maxWorkspaces: 1,
      maxMembers: 1,
    }),
    createdAt: now,
  })

  // Add user as owner
  await db.insert(members).values({
    id: memberId,
    organizationId: orgId,
    userId,
    role: "owner",
    createdAt: now,
  })

  return { orgId, slug }
}
