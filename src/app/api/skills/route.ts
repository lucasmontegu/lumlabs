/**
 * Skills API Endpoints
 *
 * GET /api/skills - List organization skills
 * POST /api/skills - Create a new skill
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, skills } from "@/db";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/id";

// GET /api/skills - List organization skills
export async function GET(_request: NextRequest) {
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

    const orgSkills = await db
      .select()
      .from(skills)
      .where(eq(skills.organizationId, organizationId))
      .orderBy(skills.name);

    return NextResponse.json({
      skills: orgSkills.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description || undefined,
        content: s.content,
        triggers: s.triggers || [],
        authorType: s.authorType,
        isActive: s.isActive,
        version: s.version || "1.0.0",
        createdAt: s.createdAt?.toISOString(),
        updatedAt: s.updatedAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching skills:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/skills - Create a new skill
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
    const { name, slug, description, content, triggers } = body;

    if (!name || !slug || !content) {
      return NextResponse.json(
        { error: "name, slug, and content are required" },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const existing = await db
      .select()
      .from(skills)
      .where(eq(skills.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A skill with this slug already exists" },
        { status: 409 }
      );
    }

    const id = generateId("skill");
    const now = new Date();

    const [created] = await db
      .insert(skills)
      .values({
        id,
        organizationId,
        name,
        slug,
        description: description || null,
        content,
        triggers: triggers || [],
        authorType: "organization",
        isActive: true,
        version: "1.0.0",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(
      {
        skill: {
          id: created.id,
          name: created.name,
          slug: created.slug,
          description: created.description || undefined,
          content: created.content,
          triggers: created.triggers || [],
          authorType: created.authorType,
          isActive: created.isActive,
          version: created.version || "1.0.0",
          createdAt: created.createdAt?.toISOString(),
          updatedAt: created.updatedAt?.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating skill:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
