# Phase 1: Session Flow Core - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the core session flow with states: IDLE → PLANNING → PLAN_REVIEW → BUILDING → READY

**Architecture:**
- Update session status to include `plan_review` state
- Create PlanCard component for plan approval UI
- Integrate Claude Agent SDK for planning phase
- Wire up status transitions through API and realtime updates

**Tech Stack:** Next.js 15, Zustand, Claude Agent SDK, Ably (realtime), Drizzle ORM

---

## Task 1: Update Session Status Type

**Files:**
- Modify: `src/features/session/stores/session-store.ts:3-9`
- Modify: `src/db/schema.ts:344` (comment only - schema already supports text)

**Step 1: Update SessionStatus type**

```typescript
// src/features/session/stores/session-store.ts
export type SessionStatus =
  | "idle"
  | "planning"
  | "plan_review"  // NEW: waiting for user approval
  | "building"
  | "reviewing"
  | "ready"
  | "error";
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/session/stores/session-store.ts
git commit -m "feat(session): add plan_review status to session flow"
```

---

## Task 2: Update Message Type for Plan Messages

**Files:**
- Modify: `src/features/chat/stores/chat-store.ts:3-5`

**Step 1: Add message type field**

```typescript
// src/features/chat/stores/chat-store.ts
export type MessageRole = "user" | "assistant" | "system";
export type MessageType = "text" | "plan" | "building_progress" | "ready";
export type MessagePhase = "planning" | "building" | "review";

export interface Message {
  id: string;
  sessionId: string;
  userId?: string;
  role: MessageRole;
  type?: MessageType;  // NEW: for special message rendering
  content: string;
  // ... rest stays the same
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/chat/stores/chat-store.ts
git commit -m "feat(chat): add message type for plan and progress messages"
```

---

## Task 3: Create PlanCard Component

**Files:**
- Create: `src/features/chat/components/plan-card.tsx`

**Step 1: Create the PlanCard component**

```typescript
// src/features/chat/components/plan-card.tsx
"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Cancel01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PlanItem {
  description: string;
  files?: string[];
}

interface PlanCardProps {
  plan: {
    summary: string;
    changes: PlanItem[];
    considerations?: string[];
  };
  status: "pending" | "approved" | "rejected";
  onApprove?: () => void;
  onAdjust?: () => void;
  isLoading?: boolean;
}

export function PlanCard({
  plan,
  status,
  onApprove,
  onAdjust,
  isLoading,
}: PlanCardProps) {
  const isPending = status === "pending";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              className="size-4 text-primary"
            />
          </div>
          <div>
            <p className="text-sm font-medium">Plan Ready</p>
            <p className="text-xs text-muted-foreground">Review before building</p>
          </div>
        </div>
        {status === "approved" && (
          <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-600">
            <HugeiconsIcon icon={Tick01Icon} className="size-3" />
            Approved
          </span>
        )}
        {status === "rejected" && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-600">
            <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            Adjusting
          </span>
        )}
      </div>

      {/* Summary */}
      <div>
        <p className="text-sm text-foreground">{plan.summary}</p>
      </div>

      {/* Changes */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          What will change
        </p>
        <ul className="space-y-1.5">
          {plan.changes.map((change, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
              <span>{change.description}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Considerations */}
      {plan.considerations && plan.considerations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Considerations
          </p>
          <ul className="space-y-1.5">
            {plan.considerations.map((note, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={onApprove}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? "Starting..." : "Looks good, build it"}
          </Button>
          <Button
            variant="outline"
            onClick={onAdjust}
            disabled={isLoading}
          >
            Adjust
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Export from chat index**

Add to `src/features/chat/index.ts`:
```typescript
export { PlanCard, type PlanItem } from "./components/plan-card";
```

**Step 3: Verify component renders**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/chat/components/plan-card.tsx src/features/chat/index.ts
git commit -m "feat(chat): add PlanCard component for plan approval UI"
```

---

## Task 4: Create BuildingProgress Component

**Files:**
- Create: `src/features/chat/components/building-progress.tsx`

**Step 1: Create the component**

```typescript
// src/features/chat/components/building-progress.tsx
"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon, FileEditIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface FileChange {
  path: string;
  status: "pending" | "writing" | "done";
}

interface BuildingProgressProps {
  files: FileChange[];
  currentFile?: string;
  isComplete?: boolean;
}

export function BuildingProgress({
  files,
  currentFile,
  isComplete,
}: BuildingProgressProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        {!isComplete ? (
          <>
            <HugeiconsIcon
              icon={Loading03Icon}
              className="size-4 text-primary animate-spin"
            />
            <span className="text-sm font-medium">Building...</span>
          </>
        ) : (
          <>
            <HugeiconsIcon
              icon={Tick01Icon}
              className="size-4 text-green-500"
            />
            <span className="text-sm font-medium text-green-600">Build complete</span>
          </>
        )}
      </div>

      {/* Current file */}
      {currentFile && !isComplete && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HugeiconsIcon icon={FileEditIcon} className="size-3.5" />
          <span className="font-mono text-xs">{currentFile}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <div
              key={file.path}
              className={cn(
                "flex items-center gap-2 text-xs font-mono",
                file.status === "done" && "text-muted-foreground",
                file.status === "writing" && "text-primary"
              )}
            >
              {file.status === "writing" && (
                <HugeiconsIcon icon={Loading03Icon} className="size-3 animate-spin" />
              )}
              {file.status === "done" && (
                <HugeiconsIcon icon={Tick01Icon} className="size-3 text-green-500" />
              )}
              {file.status === "pending" && (
                <span className="size-3" />
              )}
              <span>{file.path.split("/").pop()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Export from chat index**

Add to `src/features/chat/index.ts`:
```typescript
export { BuildingProgress } from "./components/building-progress";
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/chat/components/building-progress.tsx src/features/chat/index.ts
git commit -m "feat(chat): add BuildingProgress component for build status"
```

---

## Task 5: Create ReadyCard Component

**Files:**
- Create: `src/features/chat/components/ready-card.tsx`

**Step 1: Create the component**

```typescript
// src/features/chat/components/ready-card.tsx
"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, GitPullRequestIcon, ArrowReloadHorizontalIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

interface ReadyCardProps {
  filesChanged: string[];
  onCreatePR?: () => void;
  onIterate?: () => void;
  isLoading?: boolean;
  prUrl?: string;
}

export function ReadyCard({
  filesChanged,
  onCreatePR,
  onIterate,
  isLoading,
  prUrl,
}: ReadyCardProps) {
  return (
    <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-green-500/10">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            className="size-4 text-green-500"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-green-600">Changes Ready</p>
          <p className="text-xs text-muted-foreground">
            {filesChanged.length} file{filesChanged.length !== 1 ? "s" : ""} modified
          </p>
        </div>
      </div>

      {/* Files changed */}
      {filesChanged.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filesChanged.slice(0, 5).map((file) => (
            <span
              key={file}
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
            >
              {file.split("/").pop()}
            </span>
          ))}
          {filesChanged.length > 5 && (
            <span className="text-xs text-muted-foreground">
              +{filesChanged.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {prUrl ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.open(prUrl, "_blank")}
          >
            <HugeiconsIcon icon={GitPullRequestIcon} className="size-4" />
            View PR
          </Button>
          <Button
            variant="ghost"
            onClick={onIterate}
          >
            <HugeiconsIcon icon={ArrowReloadHorizontalIcon} className="size-4" />
            Iterate
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            onClick={onCreatePR}
            disabled={isLoading}
            className="flex-1"
          >
            <HugeiconsIcon icon={GitPullRequestIcon} className="size-4" />
            {isLoading ? "Creating PR..." : "Create PR"}
          </Button>
          <Button
            variant="outline"
            onClick={onIterate}
            disabled={isLoading}
          >
            Iterate more
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Export from chat index**

Add to `src/features/chat/index.ts`:
```typescript
export { ReadyCard } from "./components/ready-card";
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/chat/components/ready-card.tsx src/features/chat/index.ts
git commit -m "feat(chat): add ReadyCard component for PR creation"
```

---

## Task 6: Create Agent Service with Claude SDK

**Files:**
- Create: `src/features/agent/claude-agent.ts`

**Step 1: Create the Claude Agent service**

```typescript
// src/features/agent/claude-agent.ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export interface PlanResult {
  summary: string;
  changes: Array<{
    description: string;
    files?: string[];
  }>;
  considerations?: string[];
}

export interface AgentContext {
  repoName: string;
  repoUrl: string;
  branch: string;
  techStack?: string[];
  existingFiles?: string[];
}

/**
 * Generate a plan for a feature request
 */
export async function generatePlan(
  userRequest: string,
  context: AgentContext
): Promise<PlanResult> {
  const systemPrompt = `You are a product planning assistant for a software development platform. Your job is to understand feature requests and create clear, actionable plans.

## Project Context
- Repository: ${context.repoName}
- Branch: ${context.branch}
- Tech Stack: ${context.techStack?.join(", ") || "Unknown"}

## Instructions
1. Understand what the user wants to achieve
2. Create a plan in plain language that a non-technical person can understand
3. Focus on WHAT will be built, not HOW (no code)
4. List the files that will likely be changed

## Output Format
Respond with a JSON object:
{
  "summary": "One sentence describing the feature",
  "changes": [
    { "description": "User-visible change 1", "files": ["file1.tsx"] },
    { "description": "User-visible change 2", "files": ["file2.tsx"] }
  ],
  "considerations": ["Any important notes or questions"]
}

IMPORTANT: Respond ONLY with valid JSON, no markdown or explanation.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: userRequest,
      },
    ],
    system: systemPrompt,
  });

  // Extract text content
  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON response
  try {
    const plan = JSON.parse(textContent.text) as PlanResult;
    return plan;
  } catch {
    // If JSON parsing fails, create a simple plan from the text
    return {
      summary: textContent.text.slice(0, 200),
      changes: [{ description: "Implement the requested feature" }],
      considerations: ["Plan could not be parsed - review manually"],
    };
  }
}

/**
 * Stream a message from Claude (for building phase - placeholder)
 */
export async function* streamBuildProgress(
  plan: PlanResult,
  context: AgentContext
): AsyncGenerator<{ type: string; content: string }> {
  // This is a placeholder - actual implementation will use Claude Agent SDK
  // with tools for file operations in the sandbox

  yield { type: "start", content: "Starting build..." };

  for (const change of plan.changes) {
    yield { type: "file", content: change.files?.[0] || "unknown" };
    // Simulate work
    await new Promise((r) => setTimeout(r, 1000));
    yield { type: "done", content: change.files?.[0] || "unknown" };
  }

  yield { type: "complete", content: "Build complete" };
}
```

**Step 2: Export from agent index**

Update `src/features/agent/index.ts`:
```typescript
export {
  generatePlan,
  streamBuildProgress,
  type PlanResult,
  type AgentContext,
} from "./claude-agent";

// Keep existing exports
export {
  createSandbox,
  // ... rest of daytona exports
} from "./daytona-service";
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/agent/claude-agent.ts src/features/agent/index.ts
git commit -m "feat(agent): add Claude Agent service for plan generation"
```

---

## Task 7: Create Plan Generation API

**Files:**
- Create: `src/app/api/sessions/[sessionId]/plan/route.ts`

**Step 1: Create the API route**

```typescript
// src/app/api/sessions/[sessionId]/plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, featureSessions, messages, approvals, repositories } from "@/db";
import { eq, and } from "drizzle-orm";
import { generatePlan } from "@/features/agent/claude-agent";
import { nanoid } from "nanoid";

type RouteParams = { params: Promise<{ sessionId: string }> };

// POST /api/sessions/[sessionId]/plan - Generate a plan
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

    const body = await request.json();
    const { userMessage } = body;

    if (!userMessage) {
      return NextResponse.json(
        { error: "userMessage is required" },
        { status: 400 }
      );
    }

    // Get feature session with repository
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

    const { session: fs, repository } = featureSession[0];

    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    // Update session status to planning
    await db
      .update(featureSessions)
      .set({ status: "planning", updatedAt: new Date() })
      .where(eq(featureSessions.id, sessionId));

    // Save user message
    const userMsgId = nanoid();
    await db.insert(messages).values({
      id: userMsgId,
      sessionId,
      userId: session.user.id,
      role: "user",
      content: userMessage,
      phase: "planning",
      createdAt: new Date(),
    });

    // Generate plan using Claude
    const plan = await generatePlan(userMessage, {
      repoName: repository.name,
      repoUrl: repository.url,
      branch: fs.branchName,
      techStack: (repository.context as { techStack?: string[] })?.techStack,
    });

    // Save plan as assistant message
    const planMsgId = nanoid();
    await db.insert(messages).values({
      id: planMsgId,
      sessionId,
      role: "assistant",
      content: JSON.stringify(plan),
      phase: "planning",
      metadata: { type: "plan" },
      createdAt: new Date(),
    });

    // Create pending approval
    const approvalId = nanoid();
    await db.insert(approvals).values({
      id: approvalId,
      sessionId,
      messageId: planMsgId,
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
      messageId: planMsgId,
      approvalId,
    });
  } catch (error) {
    console.error("Error generating plan:", error);

    // Reset session status on error
    const { sessionId } = await params;
    await db
      .update(featureSessions)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(featureSessions.id, sessionId));

    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/sessions/[sessionId]/plan/route.ts
git commit -m "feat(api): add plan generation endpoint"
```

---

## Task 8: Create Plan Approval API

**Files:**
- Create: `src/app/api/sessions/[sessionId]/plan/approve/route.ts`

**Step 1: Create the API route**

```typescript
// src/app/api/sessions/[sessionId]/plan/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, featureSessions, approvals } from "@/db";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ sessionId: string }> };

// POST /api/sessions/[sessionId]/plan/approve - Approve or reject plan
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

    const body = await request.json();
    const { approvalId, approved, comment } = body;

    if (!approvalId || typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "approvalId and approved are required" },
        { status: 400 }
      );
    }

    // Verify session belongs to organization
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

    // Update approval
    await db
      .update(approvals)
      .set({
        status: approved ? "approved" : "rejected",
        reviewerId: session.user.id,
        comment,
        reviewedAt: new Date(),
      })
      .where(eq(approvals.id, approvalId));

    // Update session status
    const newStatus = approved ? "building" : "idle";
    await db
      .update(featureSessions)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(featureSessions.id, sessionId));

    return NextResponse.json({
      success: true,
      status: newStatus,
    });
  } catch (error) {
    console.error("Error approving plan:", error);
    return NextResponse.json(
      { error: "Failed to approve plan" },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/sessions/[sessionId]/plan/approve/route.ts
git commit -m "feat(api): add plan approval endpoint"
```

---

## Task 9: Create useSessionFlow Hook

**Files:**
- Create: `src/features/session/hooks/use-session-flow.ts`

**Step 1: Create the hook**

```typescript
// src/features/session/hooks/use-session-flow.ts
"use client";

import * as React from "react";
import { useSessionStore, type SessionStatus } from "../stores/session-store";
import { useChatStore } from "@/features/chat/stores/chat-store";
import { nanoid } from "nanoid";

interface UseSessionFlowOptions {
  sessionId: string;
}

interface PlanData {
  summary: string;
  changes: Array<{ description: string; files?: string[] }>;
  considerations?: string[];
}

export function useSessionFlow({ sessionId }: UseSessionFlowOptions) {
  const { updateSession, getActiveSession } = useSessionStore();
  const { addMessage, startStreaming, finishStreaming, appendStreamContent } = useChatStore();

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = React.useState<PlanData | null>(null);
  const [currentApprovalId, setCurrentApprovalId] = React.useState<string | null>(null);

  const session = getActiveSession();
  const status = session?.status || "idle";

  /**
   * Send a message and generate a plan
   */
  const sendMessage = React.useCallback(
    async (content: string) => {
      if (!sessionId || isLoading) return;

      setIsLoading(true);
      setError(null);

      // Optimistically add user message
      const userMsgId = nanoid();
      addMessage(sessionId, {
        id: userMsgId,
        sessionId,
        role: "user",
        content,
        createdAt: new Date(),
      });

      // Update status to planning
      updateSession(sessionId, { status: "planning" });

      try {
        const response = await fetch(`/api/sessions/${sessionId}/plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userMessage: content }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate plan");
        }

        const data = await response.json();

        // Add plan message
        addMessage(sessionId, {
          id: data.messageId,
          sessionId,
          role: "assistant",
          type: "plan",
          content: JSON.stringify(data.plan),
          phase: "planning",
          createdAt: new Date(),
        });

        setCurrentPlan(data.plan);
        setCurrentApprovalId(data.approvalId);
        updateSession(sessionId, { status: "plan_review" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        updateSession(sessionId, { status: "error" });
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading, addMessage, updateSession]
  );

  /**
   * Approve the current plan
   */
  const approvePlan = React.useCallback(async () => {
    if (!sessionId || !currentApprovalId || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/plan/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: currentApprovalId,
          approved: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve plan");
      }

      updateSession(sessionId, { status: "building" });

      // TODO: Start build process
      // For now, just set to ready after a delay
      setTimeout(() => {
        updateSession(sessionId, { status: "ready" });
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, currentApprovalId, isLoading, updateSession]);

  /**
   * Reject the plan and request adjustments
   */
  const rejectPlan = React.useCallback(async () => {
    if (!sessionId || !currentApprovalId || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/plan/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: currentApprovalId,
          approved: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject plan");
      }

      setCurrentPlan(null);
      setCurrentApprovalId(null);
      updateSession(sessionId, { status: "idle" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, currentApprovalId, isLoading, updateSession]);

  return {
    status,
    isLoading,
    error,
    currentPlan,
    sendMessage,
    approvePlan,
    rejectPlan,
  };
}
```

**Step 2: Export from session index**

Add to `src/features/session/index.ts`:
```typescript
export { useSessionFlow } from "./hooks/use-session-flow";
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/session/hooks/use-session-flow.ts src/features/session/index.ts
git commit -m "feat(session): add useSessionFlow hook for state management"
```

---

## Task 10: Update ChatMessages to Render Special Cards

**Files:**
- Modify: `src/features/chat/components/chat-messages.tsx`

**Step 1: Update to render PlanCard and ReadyCard**

```typescript
// src/features/chat/components/chat-messages.tsx
"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, RobotIcon, Alert02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { type Message, type MessagePhase } from "../stores/chat-store";
import { PlanCard } from "./plan-card";
import { ReadyCard } from "./ready-card";
import { BuildingProgress } from "./building-progress";

interface ChatMessagesProps {
  messages: Message[];
  streamingContent?: string;
  isStreaming?: boolean;
  // Callbacks for special cards
  onApprovePlan?: (messageId: string) => void;
  onRejectPlan?: (messageId: string) => void;
  onCreatePR?: () => void;
  onIterate?: () => void;
  planApprovalStatus?: Record<string, "pending" | "approved" | "rejected">;
  buildingFiles?: Array<{ path: string; status: "pending" | "writing" | "done" }>;
  prUrl?: string;
}

const phaseLabels: Record<MessagePhase, string> = {
  planning: "Planning",
  building: "Building",
  review: "Reviewing",
};

const phaseColors: Record<MessagePhase, string> = {
  planning: "bg-yellow-500/10 text-yellow-600",
  building: "bg-blue-500/10 text-blue-600",
  review: "bg-purple-500/10 text-purple-600",
};

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : isSystem
              ? "bg-muted text-muted-foreground"
              : "bg-muted text-foreground"
        )}
      >
        <HugeiconsIcon
          icon={isUser ? UserIcon : isSystem ? Alert02Icon : RobotIcon}
          className="size-4"
        />
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Phase badge */}
        {message.phase && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              phaseColors[message.phase]
            )}
          >
            {phaseLabels[message.phase]}
          </span>
        )}

        {/* Message content */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2",
            isUser
              ? "bg-primary text-primary-foreground"
              : isSystem
                ? "bg-muted/50 text-muted-foreground italic"
                : "bg-muted text-foreground"
          )}
        >
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>

        {/* Metadata */}
        {message.metadata?.filesChanged && message.metadata.filesChanged.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.metadata.filesChanged.slice(0, 3).map((file) => (
              <span
                key={file}
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
              >
                {file.split("/").pop()}
              </span>
            ))}
            {message.metadata.filesChanged.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{message.metadata.filesChanged.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StreamingMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
        <HugeiconsIcon icon={RobotIcon} className="size-4" />
      </div>
      <div className="flex max-w-[75%] flex-col gap-1">
        <div className="rounded-2xl bg-muted px-4 py-2 text-foreground">
          <p className="whitespace-pre-wrap text-sm">{content}</p>
          <span className="inline-block size-2 animate-pulse rounded-full bg-current" />
        </div>
      </div>
    </div>
  );
}

export function ChatMessages({
  messages,
  streamingContent,
  isStreaming,
  onApprovePlan,
  onRejectPlan,
  onCreatePR,
  onIterate,
  planApprovalStatus = {},
  buildingFiles = [],
  prUrl,
}: ChatMessagesProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon icon={RobotIcon} className="size-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Ready to build</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Describe what you want to create and I&apos;ll help you plan and build
            it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((message) => {
        // Check if this is a plan message
        const isPlanMessage =
          message.role === "assistant" &&
          (message.type === "plan" || (message.metadata as { type?: string })?.type === "plan");

        if (isPlanMessage) {
          try {
            const plan = JSON.parse(message.content);
            const status = planApprovalStatus[message.id] || "pending";
            return (
              <PlanCard
                key={message.id}
                plan={plan}
                status={status}
                onApprove={() => onApprovePlan?.(message.id)}
                onAdjust={() => onRejectPlan?.(message.id)}
              />
            );
          } catch {
            // Fall through to regular message if JSON parse fails
          }
        }

        // Check if this is a building progress message
        if (message.type === "building_progress") {
          return (
            <BuildingProgress
              key={message.id}
              files={buildingFiles}
              currentFile={buildingFiles.find(f => f.status === "writing")?.path}
            />
          );
        }

        // Check if this is a ready message
        if (message.type === "ready") {
          return (
            <ReadyCard
              key={message.id}
              filesChanged={message.metadata?.filesChanged || []}
              onCreatePR={onCreatePR}
              onIterate={onIterate}
              prUrl={prUrl}
            />
          );
        }

        return <MessageBubble key={message.id} message={message} />;
      })}
      {isStreaming && streamingContent && (
        <StreamingMessage content={streamingContent} />
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/chat/components/chat-messages.tsx
git commit -m "feat(chat): update ChatMessages to render PlanCard and ReadyCard"
```

---

## Summary

After completing all 10 tasks, you will have:

1. **Updated types** for session status and message types
2. **Three new UI components**: PlanCard, BuildingProgress, ReadyCard
3. **Claude Agent service** for plan generation
4. **Two new API routes**: plan generation and plan approval
5. **useSessionFlow hook** for managing session state transitions
6. **Updated ChatMessages** to render special message types

The session flow will work as:
```
User sends message → API generates plan → PlanCard shows → User approves → Status changes to building → (placeholder) → Ready state
```

Next phase will implement the actual building with Claude Agent SDK tools in the sandbox.
