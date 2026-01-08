import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, featureSessions, sandboxes, messages } from "@/db";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/id";
import { createOpenCodeClient } from "@/lib/opencode";
import { daytona } from "@/lib/daytona";

type RouteParams = { params: Promise<{ sessionId: string }> };

// POST /api/sessions/[sessionId]/stream - Stream AI response via SSE
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { sessionId } = await params;
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "No active organization" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get feature session with sandbox
    const featureSession = await db
      .select({
        session: featureSessions,
        sandbox: sandboxes,
      })
      .from(featureSessions)
      .leftJoin(sandboxes, eq(featureSessions.sandboxId, sandboxes.id))
      .where(
        and(
          eq(featureSessions.id, sessionId),
          eq(featureSessions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!featureSession[0]) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { session: fs, sandbox } = featureSession[0];

    if (!sandbox || !sandbox.daytonaWorkspaceId) {
      return new Response(
        JSON.stringify({ error: "No sandbox available for this session" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const body = await request.json();
    const { content, systemPrompt } = body;

    if (!content) {
      return new Response(JSON.stringify({ error: "content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Save user message to database
    const userMessageId = generateId("msg");
    await db.insert(messages).values({
      id: userMessageId,
      sessionId,
      userId: session.user.id,
      role: "user",
      content,
      createdAt: new Date(),
    });

    // Get preview URL from Daytona
    const previewUrl = await daytona.getPreviewUrl(sandbox.daytonaWorkspaceId);

    // Create OpenCode client for this sandbox
    const opencode = createOpenCodeClient(previewUrl);

    // Create or get OpenCode session
    let opencodeSessionId = fs.opencodeSessionId;
    if (!opencodeSessionId) {
      const opencodeSession = await opencode.createSession({
        systemPrompt,
      });
      opencodeSessionId = opencodeSession.id;

      // Save OpenCode session ID
      await db
        .update(featureSessions)
        .set({
          opencodeSessionId,
          status: "building",
          updatedAt: new Date(),
        })
        .where(eq(featureSessions.id, sessionId));
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        const assistantMessageId = generateId("msg");

        try {
          // Send initial event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "start", messageId: assistantMessageId })}\n\n`
            )
          );

          // Stream from OpenCode
          for await (const event of opencode.sendMessage({
            sessionId: opencodeSessionId!,
            content,
            systemPrompt,
          })) {
            if (event.type === "message" && event.data.content) {
              fullContent += event.data.content;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "chunk", content: event.data.content })}\n\n`
                )
              );
            } else if (event.type === "tool_call" && event.data.toolCall) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "tool_call", toolCall: event.data.toolCall })}\n\n`
                )
              );
            } else if (event.type === "tool_result" && event.data.toolCall) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "tool_result", toolCall: event.data.toolCall })}\n\n`
                )
              );
            } else if (event.type === "error") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", error: event.data.error })}\n\n`
                )
              );
            } else if (event.type === "done") {
              break;
            }
          }

          // Save assistant message to database
          if (fullContent) {
            await db.insert(messages).values({
              id: assistantMessageId,
              sessionId,
              role: "assistant",
              content: fullContent,
              createdAt: new Date(),
            });
          }

          // Update session status
          await db
            .update(featureSessions)
            .set({
              status: "idle",
              updatedAt: new Date(),
            })
            .where(eq(featureSessions.id, sessionId));

          // Send done event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done", messageId: assistantMessageId })}\n\n`
            )
          );
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: String(error) })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in stream endpoint:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
