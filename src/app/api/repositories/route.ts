import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, repositories } from "@/db";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/id";

// Helper to verify user has access to organization
async function verifyOrgAccess(userId: string, organizationId: string): Promise<boolean> {
  const membership = await db.query.members.findFirst({
    where: (m, { eq, and }) => and(
      eq(m.userId, userId),
      eq(m.organizationId, organizationId)
    ),
  });
  return !!membership;
}

// Helper to get organization by slug
async function getOrgBySlug(slug: string) {
  return db.query.organizations.findFirst({
    where: (org, { eq }) => eq(org.slug, slug),
  });
}

// GET /api/repositories - List repositories for an organization
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Accept organizationId or slug from query params
    const { searchParams } = new URL(request.url);
    let organizationId = searchParams.get("organizationId") || session.session.activeOrganizationId;
    const slug = searchParams.get("slug");

    // If slug provided, look up the organization
    if (slug && !organizationId) {
      const org = await getOrgBySlug(slug);
      if (org) {
        organizationId = org.id;
      }
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization specified" },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const hasAccess = await verifyOrgAccess(session.user.id, organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const repos = await db
      .select()
      .from(repositories)
      .where(eq(repositories.organizationId, organizationId));

    return NextResponse.json({ repositories: repos });
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/repositories - Connect a new repository
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, url, provider, defaultBranch = "main", organizationId: bodyOrgId, slug } = body;

    // Get organizationId from body, or look up by slug
    let organizationId = bodyOrgId || session.session.activeOrganizationId;

    if (slug && !organizationId) {
      const org = await getOrgBySlug(slug);
      if (org) {
        organizationId = org.id;
      }
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization specified" },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const hasAccess = await verifyOrgAccess(session.user.id, organizationId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!name || !url || !provider) {
      return NextResponse.json(
        { error: "name, url, and provider are required" },
        { status: 400 }
      );
    }

    if (!["github", "gitlab", "bitbucket"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const newRepo = {
      id: generateId("repo"),
      organizationId,
      name,
      url,
      provider,
      defaultBranch,
      context: null,
      connectedAt: new Date(),
    };

    await db.insert(repositories).values(newRepo);

    return NextResponse.json({ repository: newRepo }, { status: 201 });
  } catch (error) {
    console.error("Error connecting repository:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
