import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, sandboxes, repositories } from "@/db";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/id";
import { daytona } from "@/lib/daytona";

// POST /api/sandboxes - Create a new sandbox for a repository
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
    const { repositoryId } = body;

    if (!repositoryId) {
      return NextResponse.json(
        { error: "repositoryId is required" },
        { status: 400 }
      );
    }

    // Get repository
    const repo = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, repositoryId))
      .limit(1);

    if (!repo[0] || repo[0].organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    // Check if sandbox already exists for this repo
    const existingSandbox = await db
      .select()
      .from(sandboxes)
      .where(eq(sandboxes.repositoryId, repositoryId))
      .limit(1);

    if (existingSandbox[0]) {
      return NextResponse.json(
        { error: "Sandbox already exists for this repository", sandbox: existingSandbox[0] },
        { status: 409 }
      );
    }

    // Create Daytona workspace
    const daytonaWorkspace = await daytona.createWorkspace({
      name: `${repo[0].name}-${generateId()}`,
      repoUrl: repo[0].url,
      branch: repo[0].defaultBranch || "main",
    });

    // Create sandbox record
    const newSandbox = {
      id: generateId("sbx"),
      repositoryId,
      daytonaWorkspaceId: daytonaWorkspace.id,
      status: daytonaWorkspace.status,
      createdAt: new Date(),
    };

    await db.insert(sandboxes).values(newSandbox);

    return NextResponse.json({ sandbox: newSandbox }, { status: 201 });
  } catch (error) {
    console.error("Error creating sandbox:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
