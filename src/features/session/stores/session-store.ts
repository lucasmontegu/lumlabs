import { create } from "zustand";

export type SessionStatus =
  | "idle"
  | "planning"
  | "plan_review"  // Waiting for user approval of plan
  | "building"
  | "reviewing"
  | "ready"
  | "error";

export interface FeatureSession {
  id: string;
  repositoryId: string;
  repositoryName: string;
  name: string;
  branchName: string;
  status: SessionStatus;
  previewUrl?: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  // Stats for display
  linesAdded?: number;
  linesRemoved?: number;
}

interface SessionStore {
  // State
  sessions: FeatureSession[];
  activeSessionId: string | null;
  openTabs: string[]; // Session IDs that are open as tabs
  isLoading: boolean;
  error: string | null;

  // Actions
  setSessions: (sessions: FeatureSession[]) => void;
  addSession: (session: FeatureSession) => void;
  updateSession: (
    sessionId: string,
    updates: Partial<FeatureSession>
  ) => void;
  removeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;

  // Tab management
  openTab: (sessionId: string) => void;
  closeTab: (sessionId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;

  // Utilities
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getActiveSession: () => FeatureSession | undefined;
  reset: () => void;
}

const initialState = {
  sessions: [],
  activeSessionId: null,
  openTabs: [],
  isLoading: false,
  error: null,
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({
      sessions: [...state.sessions, session],
      openTabs: [...state.openTabs, session.id],
      activeSessionId: session.id,
    })),

  updateSession: (sessionId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
    })),

  removeSession: (sessionId) =>
    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== sessionId);
      const newTabs = state.openTabs.filter((id) => id !== sessionId);
      const newActiveId =
        state.activeSessionId === sessionId
          ? newTabs[newTabs.length - 1] ?? null
          : state.activeSessionId;

      return {
        sessions: newSessions,
        openTabs: newTabs,
        activeSessionId: newActiveId,
      };
    }),

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  openTab: (sessionId) =>
    set((state) => {
      if (state.openTabs.includes(sessionId)) {
        return { activeSessionId: sessionId };
      }
      return {
        openTabs: [...state.openTabs, sessionId],
        activeSessionId: sessionId,
      };
    }),

  closeTab: (sessionId) =>
    set((state) => {
      const newTabs = state.openTabs.filter((id) => id !== sessionId);
      const newActiveId =
        state.activeSessionId === sessionId
          ? newTabs[newTabs.length - 1] ?? null
          : state.activeSessionId;

      return {
        openTabs: newTabs,
        activeSessionId: newActiveId,
      };
    }),

  reorderTabs: (fromIndex, toIndex) =>
    set((state) => {
      const newTabs = [...state.openTabs];
      const [removed] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, removed);
      return { openTabs: newTabs };
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  getActiveSession: () => {
    const state = get();
    return state.sessions.find((s) => s.id === state.activeSessionId);
  },

  reset: () => set(initialState),
}));
