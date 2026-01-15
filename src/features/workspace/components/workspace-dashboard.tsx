"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowRight01Icon,
  FolderLibraryIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspaceStore } from "../stores/workspace-store";
import { useSessionStore, SessionsList, FeatureSession } from "@/features/session";
import {
  PromptComposer,
  NewEnvironmentDialog,
  type CloudEnvironment,
} from "@/features/chat";
import { generateId } from "@/lib/id";

export function WorkspaceDashboard() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;
  const { repositories, getSelectedRepo } = useWorkspaceStore();
  const { sessions, addSession } = useSessionStore();
  const selectedRepo = getSelectedRepo();
  const [isCreating, setIsCreating] = React.useState(false);
  const [showNewEnvDialog, setShowNewEnvDialog] = React.useState(false);

  // Environment state
  const [environments, setEnvironments] = React.useState<CloudEnvironment[]>([
    {
      id: "default",
      name: "Default",
      provider: "daytona",
      networkAccess: "trusted",
      isDefault: true,
    },
  ]);
  const [selectedEnvironment, setSelectedEnvironment] = React.useState<CloudEnvironment>(
    environments[0]
  );

  // Get recent sessions (sorted by updated date)
  const recentSessions = React.useMemo(() => {
    return [...sessions]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [sessions]);

  const handlePromptSubmit = async (
    prompt: string,
    options: {
      repositoryId: string;
      branch: string;
      environment: CloudEnvironment;
    }
  ) => {
    if (!selectedRepo) return;

    setIsCreating(true);
    try {
      // Create session via API
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositoryId: options.repositoryId,
          name: prompt.slice(0, 50) + (prompt.length > 50 ? "..." : ""),
          branchName: options.branch,
          sandboxProvider: options.environment.provider,
          envVars: options.environment.envVars,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const data = await response.json();
      const session = data.session;

      // Add to local store
      addSession({
        id: session.id,
        repositoryId: session.repositoryId,
        repositoryName: selectedRepo.name,
        name: session.name,
        branchName: options.branch,
        status: "idle",
        createdById: session.createdById,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
      });

      // Navigate to session
      router.push(`/w/${workspaceSlug}/s/${session.id}?prompt=${encodeURIComponent(prompt)}`);
    } catch (error) {
      console.error("Failed to create session:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddEnvironment = () => {
    setShowNewEnvDialog(true);
  };

  const handleCreateEnvironment = (newEnv: CloudEnvironment) => {
    setEnvironments((prev) => [...prev, newEnv]);
    setSelectedEnvironment(newEnv);
  };

  // Empty state - no repos
  if (repositories.length === 0) {
    return (
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
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center py-12 px-4 bg-zinc-950 min-h-screen">
      {/* Logo / Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100">VibeCode</h1>
      </div>

      {/* Main Prompt Composer */}
      <PromptComposer
        onSubmit={handlePromptSubmit}
        onAddEnvironment={handleAddEnvironment}
        isLoading={isCreating}
        environments={environments}
        selectedEnvironment={selectedEnvironment}
        onEnvironmentChange={setSelectedEnvironment}
      />

      {/* Sessions List */}
      <SessionsList sessions={recentSessions} title="Sessions" />

      {/* New Environment Dialog */}
      <NewEnvironmentDialog
        open={showNewEnvDialog}
        onOpenChange={setShowNewEnvDialog}
        onCreateEnvironment={handleCreateEnvironment}
      />
    </div>
  );
}
