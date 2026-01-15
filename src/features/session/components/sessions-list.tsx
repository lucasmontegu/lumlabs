"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { FilterIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FeatureSession } from "../stores/session-store";

interface SessionsListProps {
  sessions: FeatureSession[];
  title?: string;
  showFilter?: boolean;
}

const statusColors: Record<string, string> = {
  idle: "bg-zinc-500",
  planning: "bg-yellow-500",
  plan_review: "bg-orange-500",
  building: "bg-blue-500",
  reviewing: "bg-purple-500",
  ready: "bg-green-500",
  error: "bg-red-500",
};

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return "just now";
      return `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) return "yesterday";

  // Format as weekday for recent, otherwise date
  if (diffDays < 7) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SessionRow({ session }: { session: FeatureSession }) {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  const hasChanges = session.linesAdded || session.linesRemoved;

  return (
    <Link
      href={`/w/${workspaceSlug}/s/${session.id}`}
      className="group block px-4 py-3 hover:bg-zinc-800/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-zinc-100 truncate group-hover:text-white transition-colors">
            {session.name}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
            <span className="truncate">{session.repositoryName}</span>
            <span>·</span>
            <span>{formatTimeAgo(session.updatedAt)}</span>
            {hasChanges && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  {session.linesAdded && session.linesAdded > 0 && (
                    <span className="text-green-500">+{session.linesAdded}</span>
                  )}
                  {session.linesRemoved && session.linesRemoved > 0 && (
                    <span className="text-red-500">-{session.linesRemoved}</span>
                  )}
                </span>
              </>
            )}
            {session.status === "ready" && (
              <span className="flex items-center">
                <HugeiconsIcon icon={Tick01Icon} className="size-4 text-purple-400" />
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function SessionsList({
  sessions,
  title = "Sessions",
  showFilter = true,
}: SessionsListProps) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      <div className="flex items-center justify-between px-4 mb-2">
        <h2 className="text-sm font-medium text-zinc-500">{title}</h2>
        {showFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-300"
          >
            <HugeiconsIcon icon={FilterIcon} className="size-4" />
          </Button>
        )}
      </div>
      <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/50">
        {sessions.map((session, index) => (
          <div
            key={session.id}
            className={cn(index > 0 && "border-t border-zinc-800")}
          >
            <SessionRow session={session} />
          </div>
        ))}
      </div>
    </div>
  );
}
