"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";
import { ChatFirstLayout, useSessionCreator } from "@/features/session";
import { EmptyChat } from "@/features/chat";

export function WorkspacePageClient() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;

  const {
    repositories,
    selectedRepoId,
    selectedBranch,
    getSelectedRepo,
  } = useWorkspaceStore();
  const { createSession, isCreating } = useSessionCreator();

  const [branches, setBranches] = React.useState<string[]>([]);

  // Fetch branches when repo changes
  React.useEffect(() => {
    if (!selectedRepoId) return;

    const repo = repositories.find((r) => r.id === selectedRepoId);
    if (!repo) return;

    // Fetch branches from API
    async function fetchBranches() {
      try {
        const response = await fetch(
          `/api/git/${repo?.provider}/branches?repoId=${selectedRepoId}`
        );
        if (response.ok) {
          const data = await response.json();
          setBranches(data.branches?.map((b: { name: string }) => b.name) || []);
        }
      } catch (error) {
        console.error("Failed to fetch branches:", error);
        // Fall back to default branch
        setBranches([repo?.defaultBranch || "main"]);
      }
    }

    fetchBranches();
  }, [selectedRepoId, repositories]);

  const handleSendMessage = async (message: string) => {
    if (!selectedRepoId || !selectedBranch) {
      // If no repo selected, navigate to connect page
      router.push(`/w/${workspaceSlug}/connect`);
      return;
    }

    const repo = getSelectedRepo();
    if (!repo) return;

    try {
      await createSession({
        repositoryId: selectedRepoId,
        repositoryName: repo.name,
        branchName: selectedBranch,
        initialMessage: message,
      });
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  // If no repos connected, show connect prompt
  if (repositories.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="text-xl font-semibold">Conecta tu primer proyecto</h2>
        <p className="max-w-md text-muted-foreground">
          Para empezar a construir, necesitas conectar un repositorio de Git.
        </p>
        <button
          onClick={() => router.push(`/w/${workspaceSlug}/connect`)}
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Conectar repositorio
        </button>
      </div>
    );
  }

  return (
    <ChatFirstLayout
      chatPanel={
        <EmptyChat
          onSendMessage={handleSendMessage}
          isLoading={isCreating}
          branches={branches}
        />
      }
    />
  );
}
