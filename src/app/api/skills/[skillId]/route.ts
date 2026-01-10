/**
 * Individual Skill API Endpoints
 *
 * GET /api/skills/[skillId] - Get a specific skill
 * PATCH /api/skills/[skillId] - Update a skill
 * DELETE /api/skills/[skillId] - Delete a skill
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, skills } from "@/db";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ skillId: string }> };

// GET /api/skills/[skillId] - Get a specific skill
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { skillId } = await params;
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    const skill = await db
      .select()
      .from(skills)
      .where(
        and(eq(skills.id, skillId), eq(skills.organizationId, organizationId))
      )
      .limit(1);

    if (!skill[0]) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    return NextResponse.json({
      skill: {
        id: skill[0].id,
        name: skill[0].name,
        slug: skill[0].slug,
        description: skill[0].description || undefined,
        content: skill[0].content,
        triggers: skill[0].triggers || [],
        authorType: skill[0].authorType,
        isActive: skill[0].isActive,
        version: skill[0].version || "1.0.0",
        createdAt: skill[0].createdAt?.toISOString(),
        updatedAt: skill[0].updatedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching skill:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/skills/[skillId] - Update a skill
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { skillId } = await params;
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Verify skill exists and belongs to organization
    const existing = await db
      .select()
      .from(skills)
      .where(
        and(eq(skills.id, skillId), eq(skills.organizationId, organizationId))
      )
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, slug, description, content, triggers, isActive } = body;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (description !== undefined) updates.description = description || null;
    if (content !== undefined) updates.content = content;
    if (triggers !== undefined) updates.triggers = triggers;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db
      .update(skills)
      .set(updates)
      .where(eq(skills.id, skillId))
      .returning();

    return NextResponse.json({
      skill: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        description: updated.description || undefined,
        content: updated.content,
        triggers: updated.triggers || [],
        authorType: updated.authorType,
        isActive: updated.isActive,
        version: updated.version || "1.0.0",
        createdAt: updated.createdAt?.toISOString(),
        updatedAt: updated.updatedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating skill:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/skills/[skillId] - Delete a skill
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { skillId } = await params;
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Verify skill exists and belongs to organization
    const existing = await db
      .select()
      .from(skills)
      .where(
        and(eq(skills.id, skillId), eq(skills.organizationId, organizationId))
      )
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    await db.delete(skills).where(eq(skills.id, skillId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting skill:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
