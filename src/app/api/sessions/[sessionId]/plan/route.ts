import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  db,
  featureSessions,
  repositories,
  messages,
  approvals,
} from "@/db";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/id";
import { generatePlan, type AgentContext } from "@/features/agent";

type RouteParams = { params: Promise<{ sessionId: string }> };

// POST /api/sessions/[sessionId]/plan - Generate a plan for a feature request
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

    // Get session with repository
    const featureSession = await db
      .select({
        session: featureSessions,
        repository: repositories,
      })
      .from(featureSessions)
      .leftJoin(repositories, eq(featureSessions.repositoryId, repositories.id))
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

    const { session: sess, repository } = featureSession[0];

    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found for session" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { request: userRequest } = body;

    if (!userRequest || typeof userRequest !== "string") {
      return NextResponse.json(
        { error: "request is required and must be a string" },
        { status: 400 }
      );
    }

    // Save the user's request as a message first
    const userMessageId = generateId("msg");
    await db.insert(messages).values({
      id: userMessageId,
      sessionId,
      userId: session.user.id,
      role: "user",
      content: userRequest,
      phase: "planning",
      createdAt: new Date(),
    });

    // Update session status to planning
    await db
      .update(featureSessions)
      .set({ status: "planning", updatedAt: new Date() })
      .where(eq(featureSessions.id, sessionId));

    // Build context for agent
    const repoContext = repository.context as {
      summary?: string;
      techStack?: string[];
      keyFiles?: { path: string; description: string }[];
    } | null;

    const agentContext: AgentContext = {
      repoName: repository.name,
      repoUrl: repository.url,
      branch: sess.branchName,
      techStack: repoContext?.techStack,
      existingFiles: repoContext?.keyFiles?.map((f) => f.path),
    };

    // Generate the plan
    const plan = await generatePlan(userRequest, agentContext);

    // Save the plan as an assistant message
    const planMessageId = generateId("msg");
    await db.insert(messages).values({
      id: planMessageId,
      sessionId,
      userId: null,
      role: "assistant",
      content: JSON.stringify(plan),
      phase: "planning",
      metadata: { type: "plan" },
      createdAt: new Date(),
    });

    // Create approval record
    const approvalId = generateId("apr");
    await db.insert(approvals).values({
      id: approvalId,
      sessionId,
      messageId: planMessageId,
      status: "pending",
      createdAt: new Date(),
    });

    // Update session status to plan_review
    await db
      .update(featureSessions)
      .set({ status: "plan_review", updatedAt: new Date() })
      .where(eq(featureSessions.id, sessionId));

    return NextResponse.json({
      plan,
      messageId: planMessageId,
      approvalId,
      status: "plan_review",
    });
  } catch (error) {
    console.error("Error generating plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/sessions/[sessionId]/plan - Get the current plan for a session
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

    // Verify session belongs to org
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

    // Get the latest plan message with approval
    const latestPlan = await db
      .select({
        message: messages,
        approval: approvals,
      })
      .from(messages)
      .leftJoin(approvals, eq(messages.id, approvals.messageId))
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt)
      .limit(1);

    // Filter for plan messages (metadata.type === 'plan')
    const planMessage = latestPlan.find(
      (m) => (m.message.metadata as { type?: string })?.type === "plan"
    );

    if (!planMessage) {
      return NextResponse.json({ plan: null, approval: null });
    }

    // Parse plan content
    let plan;
    try {
      plan = JSON.parse(planMessage.message.content);
    } catch {
      plan = { summary: planMessage.message.content, changes: [] };
    }

    return NextResponse.json({
      plan,
      messageId: planMessage.message.id,
      approval: planMessage.approval,
    });
  } catch (error) {
    console.error("Error fetching plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
