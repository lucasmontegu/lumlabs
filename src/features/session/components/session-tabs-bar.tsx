"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Add01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useSessionStore, FeatureSession } from "@/features/session";

const statusColors = {
  idle: "bg-muted-foreground",
  planning: "bg-yellow-500",
  plan_review: "bg-orange-500",
  building: "bg-blue-500 animate-pulse",
  reviewing: "bg-purple-500",
  ready: "bg-green-500",
  error: "bg-red-500",
};

interface SessionTabProps {
  session: FeatureSession;
  isActive: boolean;
  workspaceSlug: string;
  onClose: (sessionId: string) => void;
}

function SessionTab({ session, isActive, workspaceSlug, onClose }: SessionTabProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose(session.id);
  };

  return (
    <Link
      href={`/w/${workspaceSlug}/s/${session.id}`}
      className={cn(
        "group relative flex h-9 min-w-[120px] max-w-[200px] items-center gap-2 border-r border-border px-3 text-sm transition-colors",
        isActive
          ? "bg-background text-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {/* Status indicator */}
      <div className={cn("size-2 shrink-0 rounded-full", statusColors[session.status])} />

      {/* Session name */}
      <span className="flex-1 truncate text-xs">{session.name}</span>

      {/* Close button */}
      <button
        onClick={handleClose}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-sm transition-colors",
          "opacity-0 group-hover:opacity-100",
          "hover:bg-muted-foreground/20"
        )}
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
      </button>

      {/* Active indicator line */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
      )}
    </Link>
  );
}

export function SessionTabsBar() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;
  const sessionId = params.sessionId as string | undefined;

  const { sessions, removeSession, activeSessionId } = useSessionStore();

  const handleCloseSession = (id: string) => {
    removeSession(id);
    // If closing active session, navigate to workspace home or another session
    if (id === sessionId) {
      const remainingSessions = sessions.filter((s) => s.id !== id);
      if (remainingSessions.length > 0) {
        router.push(`/w/${workspaceSlug}/s/${remainingSessions[0].id}`);
      } else {
        router.push(`/w/${workspaceSlug}`);
      }
    }
  };

  const handleNewSession = () => {
    router.push(`/w/${workspaceSlug}`);
  };

  // Only show if there are sessions
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="flex h-9 items-stretch border-b border-border bg-muted/30">
      {/* Session tabs */}
      <div className="flex flex-1 items-stretch overflow-x-auto">
        {sessions.map((session) => (
          <SessionTab
            key={session.id}
            session={session}
            isActive={session.id === sessionId}
            workspaceSlug={workspaceSlug}
            onClose={handleCloseSession}
          />
        ))}
      </div>

      {/* New session button */}
      <button
        onClick={handleNewSession}
        className="flex h-9 w-9 shrink-0 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Nueva sesión"
      >
        <HugeiconsIcon icon={Add01Icon} className="size-4" />
      </button>
    </div>
  );
}
