import { create } from "zustand";

export interface Repository {
  id: string;
  name: string;
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
  isLoading: boolean;
  error: string | null;

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  setRepositories: (repositories: Repository[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  workspaces: [],
  activeWorkspace: null,
  repositories: [],
  isLoading: false,
  error: null,
};

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  ...initialState,

  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  setRepositories: (repositories) => set({ repositories }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
