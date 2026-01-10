"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "../stores/session-store";

interface SandboxStatus {
  id: string;
  status: string;
  previewUrl?: string;
}

/**
 * Hook to fetch and manage preview URL for the active session's sandbox
 */
export function useSessionPreview() {
  const { activeSessionId, getActiveSession, updateSession } = useSessionStore();
  const session = getActiveSession();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sandbox status when session changes or becomes active
  useEffect(() => {
    if (!activeSessionId || !session) return;

    // If we already have a preview URL and session status is not error, skip
    if (session.previewUrl && session.status !== "error") return;

    const fetchPreview = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch the session to get sandbox info
        const sessionResponse = await fetch(`/api/sessions/${activeSessionId}`);
        if (!sessionResponse.ok) {
          throw new Error("Failed to fetch session");
        }

        const sessionData = await sessionResponse.json();
        const sandboxId = sessionData.session?.sandboxId;

        if (!sandboxId) {
          // No sandbox yet, nothing to fetch
          setIsLoading(false);
          return;
        }

        // Fetch sandbox status to get preview URL
        const sandboxResponse = await fetch(`/api/sandboxes/${sandboxId}`);
        if (!sandboxResponse.ok) {
          throw new Error("Failed to fetch sandbox status");
        }

        const sandboxData = (await sandboxResponse.json()) as {
          sandbox: SandboxStatus;
        };

        // Update session with preview URL if available
        if (sandboxData.sandbox?.previewUrl) {
          updateSession(activeSessionId, {
            previewUrl: sandboxData.sandbox.previewUrl,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [activeSessionId, session?.previewUrl, session?.status, updateSession, session]);

  return {
    isLoading,
    error,
    previewUrl: session?.previewUrl || null,
  };
}
