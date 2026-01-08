"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowRight01Icon,
  FolderLibraryIcon,
  Time01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceStore, Repository } from "../stores/workspace-store";
import { useSessionStore, FeatureSession } from "@/features/session";
import { cn } from "@/lib/utils";

function RepoCard({ repo }: { repo: Repository }) {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  return (
    <Link href={`/w/${workspaceSlug}?repo=${repo.id}`}>
      <Card className="group transition-shadow hover:ring-2 hover:ring-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-lg font-semibold uppercase">
              {repo.name.charAt(0)}
            </div>
            <div className="flex-1">
              <CardTitle className="truncate">{repo.name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {repo.sessionCount} session{repo.sessionCount !== 1 ? "s" : ""}
              </p>
            </div>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            />
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

function ConnectRepoCard() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  return (
    <Link href={`/w/${workspaceSlug}/connect`}>
      <Card className="flex h-full cursor-pointer flex-col items-center justify-center border-dashed transition-colors hover:bg-muted/50">
        <CardContent className="flex flex-col items-center gap-2 py-6">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <HugeiconsIcon icon={Add01Icon} className="size-5" />
          </div>
          <span className="text-sm font-medium">Connect repository</span>
        </CardContent>
      </Card>
    </Link>
  );
}

function SessionRow({ session }: { session: FeatureSession }) {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  const statusColors = {
    idle: "bg-muted-foreground",
    planning: "bg-yellow-500",
    building: "bg-blue-500",
    reviewing: "bg-purple-500",
    ready: "bg-green-500",
    error: "bg-red-500",
  };

  const timeAgo = React.useMemo(() => {
    const diff = Date.now() - new Date(session.updatedAt).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  }, [session.updatedAt]);

  return (
    <Link
      href={`/w/${workspaceSlug}/s/${session.id}`}
      className="flex items-center gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <div
        className={cn("size-2 rounded-full", statusColors[session.status])}
      />
      <div className="flex-1">
        <p className="font-medium">{session.name}</p>
        <p className="text-xs text-muted-foreground">{session.repositoryName}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <HugeiconsIcon icon={Time01Icon} className="size-3" />
        <span>{timeAgo}</span>
      </div>
    </Link>
  );
}

export function WorkspaceDashboard() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const { repositories } = useWorkspaceStore();
  const { sessions } = useSessionStore();

  // Get recent sessions (last 5)
  const recentSessions = React.useMemo(() => {
    return [...sessions]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 5);
  }, [sessions]);

  return (
    <div className="flex flex-1 flex-col gap-8 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">
            Pick up where you left off or start something new.
          </p>
        </div>
        <Link href={`/w/${workspaceSlug}/new-session`}>
          <Button>
            <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
            New Session
          </Button>
        </Link>
      </div>

      {/* Repositories */}
      <section>
        <h2 className="mb-4 text-sm font-medium uppercase text-muted-foreground">
          Projects
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {repositories.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
          <ConnectRepoCard />
        </div>
      </section>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase text-muted-foreground">
            Recent Sessions
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentSessions.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Empty state */}
      {repositories.length === 0 && recentSessions.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon icon={FolderLibraryIcon} className="size-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium">No projects yet</h3>
            <p className="text-sm text-muted-foreground">
              Connect a repository to start building features with AI.
            </p>
          </div>
          <Link href={`/w/${workspaceSlug}/connect`}>
            <Button>
              <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
              Connect repository
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
