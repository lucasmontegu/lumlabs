"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowRight01Icon,
  FolderLibraryIcon,
  Time01Icon,
  SparklesIcon,
  RocketIcon,
  CodeIcon,
  GridIcon,
  LayersIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceStore, Repository } from "../stores/workspace-store";
import { useSessionStore, FeatureSession } from "@/features/session";
import { QuickActions } from "@/features/onboarding";
import { cn } from "@/lib/utils";

const providerColors: Record<string, string> = {
  github: "from-gray-800 to-gray-900",
  gitlab: "from-orange-500 to-red-600",
  bitbucket: "from-blue-500 to-blue-700",
};

const providerIcons: Record<string, string> = {
  github: "GH",
  gitlab: "GL",
  bitbucket: "BB",
};

function RepoCard({ repo }: { repo: Repository }) {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const gradientClass = providerColors[repo.provider] || "from-primary to-primary/80";

  return (
    <Link href={`/w/${workspaceSlug}?repo=${repo.id}`}>
      <Card className="group relative overflow-hidden transition-all duration-200 hover:ring-2 hover:ring-primary/20 hover:shadow-lg hover:-translate-y-0.5">
        {/* Gradient accent at top */}
        <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", gradientClass)} />

        <CardHeader className="pb-3 pt-5">
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex size-12 items-center justify-center rounded-xl bg-gradient-to-br text-white text-sm font-bold shadow-sm",
              gradientClass
            )}>
              {providerIcons[repo.provider] || repo.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate text-base">{repo.name}</CardTitle>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {repo.sessionCount} session{repo.sessionCount !== 1 ? "s" : ""}
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">
                  {repo.provider}
                </span>
              </div>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted opacity-0 transition-opacity group-hover:opacity-100">
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </div>
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
      <Card className="group flex h-full cursor-pointer flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 bg-muted/20 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md">
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/20 transition-transform group-hover:scale-110">
            <HugeiconsIcon icon={Add01Icon} className="size-5 text-primary" />
          </div>
          <div className="text-center">
            <span className="text-sm font-medium">Connect repository</span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              GitHub, GitLab, or Bitbucket
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const statusConfig = {
  idle: { color: "bg-muted-foreground", label: "Idle", ring: "ring-muted-foreground/20" },
  planning: { color: "bg-yellow-500", label: "Planning", ring: "ring-yellow-500/20" },
  plan_review: { color: "bg-orange-500", label: "Review", ring: "ring-orange-500/20" },
  building: { color: "bg-blue-500", label: "Building", ring: "ring-blue-500/20" },
  reviewing: { color: "bg-purple-500", label: "Reviewing", ring: "ring-purple-500/20" },
  ready: { color: "bg-green-500", label: "Ready", ring: "ring-green-500/20" },
  error: { color: "bg-red-500", label: "Error", ring: "ring-red-500/20" },
};

function SessionRow({ session }: { session: FeatureSession }) {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const status = statusConfig[session.status] || statusConfig.idle;

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
      className="group flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:bg-muted/50"
    >
      <div className={cn(
        "flex size-10 items-center justify-center rounded-lg ring-2",
        status.ring
      )}>
        <div className={cn("size-2.5 rounded-full", status.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate group-hover:text-primary transition-colors">
          {session.name}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{session.repositoryName}</span>
          <span className="text-muted-foreground/40">•</span>
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 capitalize">
            {status.label}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <HugeiconsIcon icon={Time01Icon} className="size-3.5" />
          <span>{timeAgo}</span>
        </div>
        <div className="size-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}

export function WorkspaceDashboard() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;
  const { repositories } = useWorkspaceStore();
  const { sessions } = useSessionStore();
  const [inputValue, setInputValue] = React.useState("");

  // Get recent sessions (last 5)
  const recentSessions = React.useMemo(() => {
    return [...sessions]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 5);
  }, [sessions]);

  // Show welcome state when user has repos but no sessions
  const showWelcome = repositories.length > 0 && sessions.length === 0;

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Navigate to new session with the prompt
    const encodedPrompt = encodeURIComponent(inputValue.trim());
    router.push(`/w/${workspaceSlug}/new-session?prompt=${encodedPrompt}`);
  };

  // Welcome state with QuickActions
  if (showWelcome) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Welcome Header */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 mb-6">
              <HugeiconsIcon icon={SparklesIcon} className="size-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to VibeCode
            </h1>
            <p className="mt-3 text-lg text-muted-foreground max-w-md mx-auto">
              Describe what you want to build and let AI do the heavy lifting
            </p>
          </div>

          {/* Main Input Card */}
          <Card className="overflow-hidden border-2 shadow-lg">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <HugeiconsIcon icon={RocketIcon} className="size-4" />
                <span>Quick Actions</span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-6">
                <QuickActions onSelect={handleQuickAction} />
              </div>

              <div className="relative">
                <p className="mb-3 text-sm text-muted-foreground">
                  Or describe what you want to build
                </p>
                <form onSubmit={handleSubmit}>
                  <div className="relative">
                    <Input
                      placeholder="e.g., Add a dark mode toggle to the settings page..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="h-14 pr-14 text-base rounded-xl shadow-sm"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2.5 bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 disabled:bg-muted disabled:text-muted-foreground"
                    >
                      <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
                    </button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Context Badge */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <Badge variant="secondary" className="px-3 py-1.5 text-sm">
              <HugeiconsIcon icon={CodeIcon} className="size-4 mr-1.5" />
              Working on{" "}
              <span className="font-semibold ml-1">
                {repositories[0]?.name || "your project"}
              </span>
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-10 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-lg text-muted-foreground">
            Pick up where you left off or start something new
          </p>
        </div>
        <Link href={`/w/${workspaceSlug}/new-session`}>
          <Button size="lg" className="gap-2 shadow-sm">
            <HugeiconsIcon icon={SparklesIcon} className="size-4" />
            New Session
          </Button>
        </Link>
      </div>

      {/* Repositories */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <HugeiconsIcon icon={GridIcon} className="size-4 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Projects</h2>
          <Badge variant="outline" className="ml-1">
            {repositories.length}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {repositories.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
          <ConnectRepoCard />
        </div>
      </section>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <HugeiconsIcon icon={LayersIcon} className="size-4 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Recent Sessions</h2>
            <Badge variant="outline" className="ml-1">
              {sessions.length}
            </Badge>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-2">
              <div className="divide-y divide-border/50">
                {recentSessions.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </div>
            </CardContent>
          </Card>
          {sessions.length > 5 && (
            <div className="mt-4 text-center">
              <Button variant="ghost" className="text-muted-foreground">
                View all sessions
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 ml-1" />
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Empty state - no repos */}
      {repositories.length === 0 && recentSessions.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center py-16">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
            <HugeiconsIcon icon={FolderLibraryIcon} className="size-10 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">No projects yet</h3>
            <p className="mt-1 text-muted-foreground max-w-sm">
              Connect a repository to start building features with AI agents.
            </p>
          </div>
          <Link href={`/w/${workspaceSlug}/connect`}>
            <Button size="lg" className="gap-2">
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
              Connect repository
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
