"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useWorkspaceStore } from "../stores/workspace-store";

export function useLoadWorkspaceData() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  const {
    setRepositories,
    setActiveWorkspace,
    setLoading,
    setError,
    repositories,
  } = useWorkspaceStore();

  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    if (!workspaceSlug || isInitialized) return;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch repositories for this workspace (using slug)
        const response = await fetch(`/api/repositories?slug=${workspaceSlug}`);

        if (!response.ok) {
          throw new Error("Failed to fetch repositories");
        }

        const data = await response.json();

        // Transform API response to match store interface
        const repos = (data.repositories || []).map((repo: {
          id: string;
          name: string;
          url: string;
          provider: string;
          defaultBranch: string;
        }) => ({
          id: repo.id,
          name: repo.name,
          url: repo.url,
          provider: repo.provider as "github" | "gitlab" | "bitbucket",
          defaultBranch: repo.defaultBranch || "main",
          sessionCount: 0, // TODO: Get actual session count
        }));

        setRepositories(repos);

        // Set active workspace
        setActiveWorkspace({
          id: workspaceSlug,
          name: workspaceSlug, // TODO: Get actual workspace name
          slug: workspaceSlug,
        });

        setIsInitialized(true);
      } catch (error) {
        console.error("Error loading workspace data:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [workspaceSlug, isInitialized, setRepositories, setActiveWorkspace, setLoading, setError]);

  return {
    isLoading: !isInitialized,
    repositories,
  };
}
