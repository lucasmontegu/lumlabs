"use client";

import { useState, useCallback } from "react";
import { useSessionStore } from "../stores/session-store";
import { useChatStore, type Message, type Approval } from "@/features/chat";
import type { PlanData } from "@/features/chat/components/plan-card";

interface UseSessionFlowOptions {
  sessionId: string;
}

interface UseSessionFlowReturn {
  // State
  isGeneratingPlan: boolean;
  isApproving: boolean;
  error: string | null;

  // Actions
  generatePlan: (request: string) => Promise<void>;
  approvePlan: (comment?: string) => Promise<void>;
  rejectPlan: (comment?: string) => Promise<void>;

  // Helpers
  clearError: () => void;
}

export function useSessionFlow({
  sessionId,
}: UseSessionFlowOptions): UseSessionFlowReturn {
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { updateSession } = useSessionStore();
  const { addMessage, addApproval, updateApproval } = useChatStore();

  /**
   * Generate a plan for the given feature request
   */
  const generatePlan = useCallback(
    async (request: string) => {
      setIsGeneratingPlan(true);
      setError(null);

      try {
        // Update session status to planning
        updateSession(sessionId, { status: "planning" });

        // Add user message immediately for optimistic UI
        const tempUserMsgId = `temp_${Date.now()}`;
        addMessage(sessionId, {
          id: tempUserMsgId,
          sessionId,
          role: "user",
          content: request,
          phase: "planning",
          createdAt: new Date(),
        });

        // Call the plan generation API
        const response = await fetch(`/api/sessions/${sessionId}/plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to generate plan");
        }

        const { plan, messageId, approvalId, status } = await response.json();

        // Update session status
        updateSession(sessionId, { status });

        // Add plan message to chat
        const planMessage: Message = {
          id: messageId,
          sessionId,
          role: "assistant",
          type: "plan",
          content: JSON.stringify(plan),
          phase: "planning",
          createdAt: new Date(),
        };
        addMessage(sessionId, planMessage);

        // Add approval record
        const approval: Approval = {
          id: approvalId,
          messageId,
          status: "pending",
          createdAt: new Date(),
        };
        addApproval(sessionId, approval);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to generate plan";
        setError(message);
        // Reset session status on error
        updateSession(sessionId, { status: "error" });
      } finally {
        setIsGeneratingPlan(false);
      }
    },
    [sessionId, updateSession, addMessage, addApproval]
  );

  /**
   * Approve the current pending plan
   */
  const approvePlan = useCallback(
    async (comment?: string) => {
      setIsApproving(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/sessions/${sessionId}/plan/approve`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "approve", comment }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to approve plan");
        }

        const { approval, sessionStatus } = await response.json();

        // Update session status to building
        updateSession(sessionId, { status: sessionStatus });

        // Update approval in store
        updateApproval(sessionId, approval.id, {
          status: "approved",
          reviewerId: approval.reviewerId,
          comment: approval.comment,
          reviewedAt: new Date(approval.reviewedAt),
        });

        // Add system message about approval
        addMessage(sessionId, {
          id: `sys_${Date.now()}`,
          sessionId,
          role: "system",
          content: `Plan approved${comment ? `: "${comment}"` : ". Starting build..."}`,
          phase: "planning",
          createdAt: new Date(),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to approve plan";
        setError(message);
      } finally {
        setIsApproving(false);
      }
    },
    [sessionId, updateSession, updateApproval, addMessage]
  );

  /**
   * Reject the current pending plan
   */
  const rejectPlan = useCallback(
    async (comment?: string) => {
      setIsApproving(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/sessions/${sessionId}/plan/approve`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reject", comment }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to reject plan");
        }

        const { approval, sessionStatus } = await response.json();

        // Update session status back to idle
        updateSession(sessionId, { status: sessionStatus });

        // Update approval in store
        updateApproval(sessionId, approval.id, {
          status: "rejected",
          reviewerId: approval.reviewerId,
          comment: approval.comment,
          reviewedAt: new Date(approval.reviewedAt),
        });

        // Add system message about rejection
        addMessage(sessionId, {
          id: `sys_${Date.now()}`,
          sessionId,
          role: "system",
          content: `Plan rejected${comment ? `: "${comment}"` : ". Please submit a new request."}`,
          phase: "planning",
          createdAt: new Date(),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to reject plan";
        setError(message);
      } finally {
        setIsApproving(false);
      }
    },
    [sessionId, updateSession, updateApproval, addMessage]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    isGeneratingPlan,
    isApproving,
    error,
    generatePlan,
    approvePlan,
    rejectPlan,
    clearError,
  };
}

/**
 * Helper to parse plan content from a message
 */
export function parsePlanFromMessage(message: Message): PlanData | null {
  if (message.type !== "plan" && (message.metadata as { type?: string })?.type !== "plan") {
    return null;
  }

  try {
    const parsed = JSON.parse(message.content);
    return {
      summary: parsed.summary || "",
      changes: (parsed.changes || []).map(
        (c: { description: string; files?: string[] }) => ({
          description: c.description,
          files: c.files,
        })
      ),
      considerations: parsed.considerations,
    };
  } catch {
    return {
      summary: message.content.slice(0, 200),
      changes: [{ description: "Review the plan details" }],
    };
  }
}
