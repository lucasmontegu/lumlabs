import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, featureSessions, messages } from "@/db";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/id";
import {
  getDefaultProvider,
  getProvider,
  type AgentProviderType,
} from "@/lib/agent-provider";
import {
  getOrCreateSandboxForSession,
  ensureSandboxRunning,
  touchSandbox,
} from "@/features/sandbox";
import type { SandboxProviderType } from "@/lib/sandbox-provider";

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

    const body = await request.json();
    const {
      content,
      provider: providerType,
      sandboxProvider: sandboxProviderType,
    } = body as {
      content: string;
      provider?: AgentProviderType;
      sandboxProvider?: SandboxProviderType;
    };

    if (!content) {
      return new Response(JSON.stringify({ error: "content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get or create sandbox for this session (auto-provisions if needed)
    let sandbox;
    try {
      const result = await getOrCreateSandboxForSession(
        sessionId,
        organizationId,
        session.user.id,
        sandboxProviderType ? { provider: sandboxProviderType } : undefined
      );
      sandbox = result.sandbox;

      if (result.created) {
        console.log(`[Stream] Auto-created sandbox ${sandbox.id} for session ${sessionId} using ${sandbox.provider || "daytona"}`);
      }

      // Ensure sandbox is running (resume if paused)
      await ensureSandboxRunning(sandbox.id, sandbox.daytonaWorkspaceId, sandbox.provider);
    } catch (error) {
      console.error("Error getting/creating sandbox:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to provision sandbox";

      if (errorMessage === "Session not found") {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ error: `Sandbox error: ${errorMessage}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get the agent provider (use specified or default)
    const provider = providerType
      ? getProvider(providerType)
      : getDefaultProvider();

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

    // Update session status to building
    await db
      .update(featureSessions)
      .set({
        status: "building",
        updatedAt: new Date(),
      })
      .where(eq(featureSessions.id, sessionId));

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        const assistantMessageId = generateId("msg");

        try {
          // Send initial event with provider info
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "start",
                messageId: assistantMessageId,
                provider: provider.type,
              })}\n\n`
            )
          );

          // Touch sandbox to update last active timestamp
          await touchSandbox(sandbox.id);

          // Stream from agent provider
          for await (const event of provider.sendMessage({
            sessionId: sandbox.id,
            workspaceId: sandbox.daytonaWorkspaceId,
            content,
          })) {
            if (event.type === "done") {
              break;
            }

            if (event.type === "error") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", error: event.content })}\n\n`
                )
              );
              continue;
            }

            if (event.type === "preview_url") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "preview_url", url: event.content })}\n\n`
                )
              );
              continue;
            }

            // Accumulate content for database (only for message-like events)
            if (
              event.content &&
              ["message", "plan", "question", "progress"].includes(event.type)
            ) {
              fullContent += event.content + "\n";
            }

            // Send event to client
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: event.type,
                  content: event.content,
                  metadata: event.metadata,
                })}\n\n`
              )
            );
          }

          // Save assistant message to database
          if (fullContent) {
            await db.insert(messages).values({
              id: assistantMessageId,
              sessionId,
              role: "assistant",
              content: fullContent.trim(),
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

          // Update session status to error
          await db
            .update(featureSessions)
            .set({
              status: "error",
              updatedAt: new Date(),
            })
            .where(eq(featureSessions.id, sessionId));
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
