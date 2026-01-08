"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GitBranchIcon, Time01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useSessionStore, SessionStatus } from "../stores/session-store";

const statusLabels: Record<SessionStatus, string> = {
  idle: "Ready",
  planning: "Planning...",
  building: "Building...",
  reviewing: "Reviewing...",
  ready: "Complete",
  error: "Error",
};

const statusColors: Record<SessionStatus, string> = {
  idle: "text-muted-foreground",
  planning: "text-yellow-500",
  building: "text-blue-500",
  reviewing: "text-purple-500",
  ready: "text-green-500",
  error: "text-red-500",
};

export function SessionStatusBar() {
  const { getActiveSession } = useSessionStore();
  const session = getActiveSession();

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-8 items-center justify-between border-b border-border bg-muted/30 px-4 text-xs">
      <div className="flex items-center gap-4">
        {/* Branch */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <HugeiconsIcon icon={GitBranchIcon} className="size-3" />
          <span>{session.branchName}</span>
        </div>

        {/* Status */}
        <div className={cn("flex items-center gap-1", statusColors[session.status])}>
          <div className="size-1.5 animate-pulse rounded-full bg-current" />
          <span>{statusLabels[session.status]}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Repository */}
        <span className="text-muted-foreground">{session.repositoryName}</span>
      </div>
    </div>
  );
}
