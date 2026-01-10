"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";
import {
  ChatFirstLayout,
  SessionPreview,
  useSessionStore,
} from "@/features/session";
import { ChatContainer } from "@/features/chat";

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const { repositories } = useWorkspaceStore();
  const { sessions, activeSessionId, setActiveSession } = useSessionStore();

  // Set active session on mount
  React.useEffect(() => {
    if (sessionId && sessionId !== activeSessionId) {
      setActiveSession(sessionId);
    }
  }, [sessionId, activeSessionId, setActiveSession]);

  const activeSession = sessions.find((s) => s.id === sessionId);

  // Determine if we should show preview (when building or ready)
  const showPreview =
    activeSession?.status === "building" ||
    activeSession?.status === "reviewing" ||
    activeSession?.status === "ready";

  return (
    <ChatFirstLayout
      chatPanel={<ChatContainer />}
      previewPanel={<SessionPreview />}
      showPreview={showPreview}
    />
  );
}
