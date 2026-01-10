"use client";

import { useState, useCallback, useRef } from "react";
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
  isBuilding: boolean;
  isCreatingPR: boolean;
  error: string | null;
  previewUrl: string | null;
  changedFiles: string[];

  // Actions
  generatePlan: (request: string) => Promise<void>;
  approvePlan: (comment?: string) => Promise<void>;
  rejectPlan: (comment?: string) => Promise<void>;
  startBuild: () => Promise<void>;
  createPR: (options?: { title?: string; description?: string }) => Promise<{ url: string; number: number } | null>;

  // Helpers
  clearError: () => void;
}

interface BuildStreamEvent {
  type: string;
  content: string;
  phase?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

export function useSessionFlow({
  sessionId,
}: UseSessionFlowOptions): UseSessionFlowReturn {
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [changedFiles, setChangedFiles] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

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

  /**
   * Start the build phase after plan approval
   */
  const startBuild = useCallback(async () => {
    setIsBuilding(true);
    setError(null);
    setChangedFiles([]);

    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      updateSession(sessionId, { status: "building" });

      const response = await fetch(`/api/sessions/${sessionId}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start build");
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: BuildStreamEvent = JSON.parse(line.slice(6));
              handleBuildEvent(event);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return;
      }
      const message =
        err instanceof Error ? err.message : "Build failed";
      setError(message);
      updateSession(sessionId, { status: "error" });
    } finally {
      setIsBuilding(false);
      abortControllerRef.current = null;
    }
  }, [sessionId, updateSession, addMessage]);

  /**
   * Handle individual build stream events
   */
  const handleBuildEvent = useCallback(
    (event: BuildStreamEvent) => {
      switch (event.type) {
        case "phase_change":
          if (event.phase) {
            updateSession(sessionId, { status: event.phase as "building" | "ready" });
          }
          break;

        case "preview_url":
          setPreviewUrl(event.content);
          break;

        case "file_change":
          if (event.metadata?.path) {
            setChangedFiles((prev: string[]) => [...prev, event.metadata!.path as string]);
          }
          addMessage(sessionId, {
            id: `file_${Date.now()}`,
            sessionId,
            role: "system",
            content: event.content,
            phase: "building",
            metadata: event.metadata,
            createdAt: new Date(),
          });
          break;

        case "progress":
          addMessage(sessionId, {
            id: `prog_${Date.now()}`,
            sessionId,
            role: "system",
            content: event.content,
            phase: "building",
            createdAt: new Date(),
          });
          break;

        case "error":
          setError(event.content);
          break;

        case "done":
          updateSession(sessionId, { status: "ready" });
          addMessage(sessionId, {
            id: `done_${Date.now()}`,
            sessionId,
            role: "system",
            content: "Build completed successfully!",
            phase: "building",
            createdAt: new Date(),
          });
          break;
      }
    },
    [sessionId, updateSession, addMessage]
  );

  /**
   * Create a pull request from the session's changes
   */
  const createPR = useCallback(
    async (options?: { title?: string; description?: string }) => {
      setIsCreatingPR(true);
      setError(null);

      try {
        const response = await fetch(`/api/sessions/${sessionId}/pr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options || {}),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create PR");
        }

        const data = await response.json();

        // Add system message about PR creation
        addMessage(sessionId, {
          id: `pr_${Date.now()}`,
          sessionId,
          role: "system",
          content: `Pull request created: ${data.pr.url}`,
          metadata: { prUrl: data.pr.url, prNumber: data.pr.number },
          createdAt: new Date(),
        });

        return { url: data.pr.url, number: data.pr.number };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create PR";
        setError(message);
        return null;
      } finally {
        setIsCreatingPR(false);
      }
    },
    [sessionId, addMessage]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    isGeneratingPlan,
    isApproving,
    isBuilding,
    isCreatingPR,
    error,
    previewUrl,
    changedFiles,
    generatePlan,
    approvePlan,
    rejectPlan,
    startBuild,
    createPR,
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
