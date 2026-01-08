import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, repositories } from "@/db";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/id";

// GET /api/repositories - List repositories for the active organization
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
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

    const organizationId = session.session.activeOrganizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, url, provider, defaultBranch = "main" } = body;

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
