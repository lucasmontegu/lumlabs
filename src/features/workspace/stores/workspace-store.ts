import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Repository {
  id: string;
  name: string;
  fullName?: string;
  owner?: string;
  url: string;
  provider: "github" | "gitlab" | "bitbucket";
  defaultBranch: string;
  sessionCount: number;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

interface WorkspaceStore {
  // State
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  repositories: Repository[];
  selectedRepoId: string | null;
  selectedBranch: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  setRepositories: (repositories: Repository[]) => void;
  setSelectedRepo: (repoId: string | null, branch?: string) => void;
  setSelectedBranch: (branch: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getSelectedRepo: () => Repository | undefined;
  reset: () => void;
}

const initialState = {
  workspaces: [],
  activeWorkspace: null,
  repositories: [],
  selectedRepoId: null,
  selectedBranch: null,
  isLoading: false,
  error: null,
};

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setWorkspaces: (workspaces) => set({ workspaces }),
      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
      setRepositories: (repositories) => {
        const state = get();
        // Auto-select first repo if none selected
        if (!state.selectedRepoId && repositories.length > 0) {
          set({
            repositories,
            selectedRepoId: repositories[0].id,
            selectedBranch: repositories[0].defaultBranch || "main",
          });
        } else {
          set({ repositories });
        }
      },
      setSelectedRepo: (repoId, branch) => {
        const state = get();
        const repo = state.repositories.find((r) => r.id === repoId);
        set({
          selectedRepoId: repoId,
          selectedBranch: branch || repo?.defaultBranch || "main",
        });
      },
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      getSelectedRepo: () => {
        const state = get();
        return state.repositories.find((r) => r.id === state.selectedRepoId);
      },
      reset: () => set(initialState),
    }),
    {
      name: "workspace-storage",
      partialize: (state) => ({
        selectedRepoId: state.selectedRepoId,
        selectedBranch: state.selectedBranch,
      }),
    }
  )
);
