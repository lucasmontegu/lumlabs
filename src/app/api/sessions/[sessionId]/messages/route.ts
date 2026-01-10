import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, messages, featureSessions } from "@/db";
import { eq, and, asc } from "drizzle-orm";
import { generateId } from "@/lib/id";
import { ablyServer } from "@/lib/ably";

type RouteParams = { params: Promise<{ sessionId: string }> };

// GET /api/sessions/[sessionId]/messages - List messages for a session
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Verify session belongs to the organization
    const featureSession = await db
      .select()
      .from(featureSessions)
      .where(
        and(
          eq(featureSessions.id, sessionId),
          eq(featureSessions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!featureSession[0]) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const messagesList = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json({ messages: messagesList });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/sessions/[sessionId]/messages - Create a new message
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Verify session belongs to the organization
    const featureSession = await db
      .select()
      .from(featureSessions)
      .where(
        and(
          eq(featureSessions.id, sessionId),
          eq(featureSessions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!featureSession[0]) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content, role = "user", phase, mentions, metadata } = body;

    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    const newMessage = {
      id: generateId("msg"),
      sessionId,
      userId: role === "user" ? session.user.id : null,
      role,
      content,
      phase: phase || null,
      mentions: mentions || null,
      metadata: metadata || null,
      createdAt: new Date(),
    };

    await db.insert(messages).values(newMessage);

    // Update session's updatedAt
    await db
      .update(featureSessions)
      .set({ updatedAt: new Date() })
      .where(eq(featureSessions.id, sessionId));

    // Broadcast message to other users via Ably (only for user messages)
    if (role === "user") {
      try {
        await ablyServer.publishChatMessage(sessionId, {
          id: newMessage.id,
          userId: session.user.id,
          userName: session.user.name || "Anonymous",
          userImage: session.user.image || undefined,
          role: "user",
          content,
          mentions,
          metadata,
        });

        // Send mention notifications to mentioned users
        if (mentions && Array.isArray(mentions) && mentions.length > 0) {
          const userMentions = mentions.filter(
            (m: { type: string; userId?: string }) =>
              m.type === "user" && m.userId && m.userId !== session.user.id
          );

          for (const mention of userMentions) {
            if (mention.userId) {
              await ablyServer.publishMentionNotification(mention.userId, {
                sessionId,
                sessionName: featureSession[0].name,
                mentionedBy: session.user.name || "Someone",
                mentionedByImage: session.user.image || undefined,
                messagePreview: content.slice(0, 100),
                timestamp: newMessage.createdAt.toISOString(),
              });
            }
          }
        }
      } catch (ablyError) {
        // Log but don't fail the request if Ably broadcasting fails
        console.error("Failed to broadcast message via Ably:", ablyError);
      }
    }

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
