import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId } = await params;
    const body = await req.json();
    const { role } = body;

    if (!role || !["member", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'member' or 'admin'" },
        { status: 400 }
      );
    }

    // Get the member to update
    const memberToUpdate = await db.query.members.findFirst({
      where: eq(members.id, memberId),
    });

    if (!memberToUpdate) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if current user has permission
    const currentUserMembership = await db.query.members.findFirst({
      where: and(
        eq(members.organizationId, memberToUpdate.organizationId),
        eq(members.userId, session.user.id)
      ),
    });

    if (!currentUserMembership) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      );
    }

    const isOwner = currentUserMembership.role === "owner";
    const isAdmin = currentUserMembership.role === "admin" || isOwner;

    if (!isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to change member roles" },
        { status: 403 }
      );
    }

    // Can't change owner's role
    if (memberToUpdate.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change the owner's role" },
        { status: 400 }
      );
    }

    // Can't change your own role
    if (memberToUpdate.userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Update the role
    await db
      .update(members)
      .set({ role })
      .where(eq(members.id, memberId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update member role:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId } = await params;

    // Get the member to delete
    const memberToDelete = await db.query.members.findFirst({
      where: eq(members.id, memberId),
    });

    if (!memberToDelete) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if current user has permission
    const currentUserMembership = await db.query.members.findFirst({
      where: and(
        eq(members.organizationId, memberToDelete.organizationId),
        eq(members.userId, session.user.id)
      ),
    });

    if (!currentUserMembership) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      );
    }

    const isOwner = currentUserMembership.role === "owner";
    const isAdmin = currentUserMembership.role === "admin" || isOwner;

    if (!isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to remove members" },
        { status: 403 }
      );
    }

    // Can't remove the owner
    if (memberToDelete.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove the organization owner" },
        { status: 400 }
      );
    }

    // Can't remove yourself
    if (memberToDelete.userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself. Please leave the organization instead." },
        { status: 400 }
      );
    }

    // Delete the member
    await db.delete(members).where(eq(members.id, memberId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
