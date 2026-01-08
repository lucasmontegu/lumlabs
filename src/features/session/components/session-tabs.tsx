"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSessionStore, FeatureSession } from "../stores/session-store";

interface SessionTabProps {
  session: FeatureSession;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  canClose: boolean;
}

function SessionTab({
  session,
  isActive,
  onSelect,
  onClose,
  canClose,
}: SessionTabProps) {
  const statusColors = {
    idle: "bg-muted-foreground",
    planning: "bg-yellow-500",
    building: "bg-blue-500",
    reviewing: "bg-purple-500",
    ready: "bg-green-500",
    error: "bg-red-500",
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative flex items-center gap-2 rounded-t-lg border-x border-t px-4 py-2 text-sm transition-colors",
        isActive
          ? "border-border bg-background text-foreground"
          : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <div className={cn("size-1.5 rounded-full", statusColors[session.status])} />
      <span className="max-w-[150px] truncate">{session.name}</span>
      {canClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "ml-1 rounded p-0.5 transition-opacity hover:bg-muted-foreground/20",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
        </button>
      )}
    </button>
  );
}

interface SessionTabsProps {
  onNewSession?: () => void;
}

export function SessionTabs({ onNewSession }: SessionTabsProps) {
  const {
    sessions,
    openTabs,
    activeSessionId,
    setActiveSession,
    closeTab,
  } = useSessionStore();

  // Get open sessions in order
  const openSessions = openTabs
    .map((id) => sessions.find((s) => s.id === id))
    .filter((s): s is FeatureSession => s !== undefined);

  if (openSessions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-end gap-1 overflow-x-auto border-b border-border bg-muted/30 px-4">
      {openSessions.map((session) => (
        <SessionTab
          key={session.id}
          session={session}
          isActive={session.id === activeSessionId}
          onSelect={() => setActiveSession(session.id)}
          onClose={() => closeTab(session.id)}
          canClose={openSessions.length > 1}
        />
      ))}
      {onNewSession && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onNewSession}
          className="mb-1 ml-1"
        >
          <HugeiconsIcon icon={Add01Icon} className="size-3" />
        </Button>
      )}
    </div>
  );
}
