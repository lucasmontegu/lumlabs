/**
 * Build API Endpoint
 *
 * POST /api/sessions/[sessionId]/build
 *
 * Starts the build phase after plan approval.
 * Streams build progress updates via SSE.
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, featureSessions, sandboxes, approvals, messages } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import { createOrchestrator, type PlanData } from "@/features/agent";

type RouteParams = { params: Promise<{ sessionId: string }> };

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

    // Check that session is in plan_review status (plan approved)
    if (fs.status !== "plan_review" && fs.status !== "building") {
      return new Response(
        JSON.stringify({
          error: `Cannot start build in ${fs.status} status. Plan must be approved first.`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get the approved plan
    const approvedApproval = await db
      .select()
      .from(approvals)
      .where(
        and(
          eq(approvals.sessionId, sessionId),
          eq(approvals.status, "approved")
        )
      )
      .orderBy(desc(approvals.reviewedAt))
      .limit(1);

    if (!approvedApproval[0]) {
      return new Response(
        JSON.stringify({ error: "No approved plan found. Please approve a plan first." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get the plan message
    const planMessage = await db
      .select()
      .from(messages)
      .where(eq(messages.id, approvedApproval[0].messageId))
      .limit(1);

    if (!planMessage[0]) {
      return new Response(
        JSON.stringify({ error: "Plan message not found" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse the plan
    let plan: PlanData;
    try {
      plan = JSON.parse(planMessage[0].content);
    } catch {
      return new Response(
        JSON.stringify({ error: "Could not parse plan data" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create orchestrator
    const orchestrator = await createOrchestrator({
      sessionId,
      repositoryId: fs.repositoryId,
      sandboxId: sandbox.id,
      daytonaWorkspaceId: sandbox.daytonaWorkspaceId,
      organizationId,
      userId: session.user.id,
    });

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream build progress
          for await (const event of orchestrator.executePlan(plan)) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );

            if (event.type === "done") {
              break;
            }
          }
        } catch (error) {
          console.error("Build stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                content: String(error),
                timestamp: Date.now(),
              })}\n\n`
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
    console.error("Error in build endpoint:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
