"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSessionStore } from "../stores/session-store";
import { generateId } from "@/lib/id";

interface CreateSessionParams {
  repositoryId: string;
  repositoryName: string;
  branchName: string;
  initialMessage: string;
}

// Infer session name from the message (first 50 chars or until newline)
function inferSessionName(message: string): string {
  const cleaned = message.trim();
  const firstLine = cleaned.split("\n")[0];
  const truncated = firstLine.slice(0, 50);
  return truncated + (firstLine.length > 50 ? "..." : "");
}

export function useSessionCreator() {
  const router = useRouter();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addSession, openTab } = useSessionStore();

  const createSession = useCallback(
    async ({
      repositoryId,
      repositoryName,
      branchName,
      initialMessage,
    }: CreateSessionParams) => {
      setIsCreating(true);
      setError(null);

      try {
        const sessionName = inferSessionName(initialMessage);

        // Create session via API
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repositoryId,
            name: sessionName,
            branchName,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create session");
        }

        const { session } = await response.json();

        // Add session to store
        addSession({
          id: session.id,
          repositoryId,
          repositoryName,
          name: session.name,
          branchName,
          status: "idle",
          createdById: session.createdById,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
        });

        // Open as tab
        openTab(session.id);

        // Navigate to session page
        router.push(`/w/${workspaceSlug}/s/${session.id}`);

        return session;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create session";
        setError(message);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [router, workspaceSlug, addSession, openTab]
  );

  return {
    createSession,
    isCreating,
    error,
    clearError: () => setError(null),
  };
}
