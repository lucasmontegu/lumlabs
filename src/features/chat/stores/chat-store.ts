import { create } from "zustand";

export type MessageRole = "user" | "assistant" | "system";
export type MessageType = "text" | "plan" | "building_progress" | "ready";
export type MessagePhase = "planning" | "building" | "review";

export interface Mention {
  type: "user" | "agent" | "integration";
  userId?: string;
  userName?: string;
  agentType?: "reviewer" | "security" | "ux" | "planner";
  integrationId?: string;
}

export interface Message {
  id: string;
  sessionId: string;
  userId?: string;
  role: MessageRole;
  type?: MessageType;  // For special message rendering (plan, progress, ready)
  content: string;
  phase?: MessagePhase;
  mentions?: Mention[];
  metadata?: {
    tokensUsed?: number;
    filesChanged?: string[];
    toolsUsed?: string[];
    prUrl?: string;
    prNumber?: number;
    path?: string;
    [key: string]: unknown;
  };
  createdAt: Date;
}

export interface Approval {
  id: string;
  messageId: string;
  status: "pending" | "approved" | "rejected";
  reviewerId?: string;
  comment?: string;
  createdAt: Date;
  reviewedAt?: Date;
}

interface ChatStore {
  // State per session
  messagesBySession: Record<string, Message[]>;
  approvalsBySession: Record<string, Approval[]>;
  streamingContent: Record<string, string>; // Current streaming content per session
  isStreaming: Record<string, boolean>;

  // Actions
  setMessages: (sessionId: string, messages: Message[]) => void;
  addMessage: (sessionId: string, message: Message) => void;
  updateMessage: (
    sessionId: string,
    messageId: string,
    updates: Partial<Message>
  ) => void;

  // Streaming
  startStreaming: (sessionId: string) => void;
  appendStreamContent: (sessionId: string, content: string) => void;
  finishStreaming: (sessionId: string, finalMessage: Message) => void;

  // Approvals
  setApprovals: (sessionId: string, approvals: Approval[]) => void;
  addApproval: (sessionId: string, approval: Approval) => void;
  updateApproval: (
    sessionId: string,
    approvalId: string,
    updates: Partial<Approval>
  ) => void;

  // Utilities
  getMessages: (sessionId: string) => Message[];
  getApprovals: (sessionId: string) => Approval[];
  getPendingApproval: (sessionId: string) => Approval | undefined;
  clearSession: (sessionId: string) => void;
  reset: () => void;
}

const initialState = {
  messagesBySession: {},
  approvalsBySession: {},
  streamingContent: {},
  isStreaming: {},
};

export const useChatStore = create<ChatStore>((set, get) => ({
  ...initialState,

  setMessages: (sessionId, messages) =>
    set((state) => ({
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: messages,
      },
    })),

  addMessage: (sessionId, message) =>
    set((state) => ({
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: [...(state.messagesBySession[sessionId] || []), message],
      },
    })),

  updateMessage: (sessionId, messageId, updates) =>
    set((state) => ({
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: (state.messagesBySession[sessionId] || []).map((m) =>
          m.id === messageId ? { ...m, ...updates } : m
        ),
      },
    })),

  startStreaming: (sessionId) =>
    set((state) => ({
      streamingContent: { ...state.streamingContent, [sessionId]: "" },
      isStreaming: { ...state.isStreaming, [sessionId]: true },
    })),

  appendStreamContent: (sessionId, content) =>
    set((state) => ({
      streamingContent: {
        ...state.streamingContent,
        [sessionId]: (state.streamingContent[sessionId] || "") + content,
      },
    })),

  finishStreaming: (sessionId, finalMessage) =>
    set((state) => ({
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: [...(state.messagesBySession[sessionId] || []), finalMessage],
      },
      streamingContent: { ...state.streamingContent, [sessionId]: "" },
      isStreaming: { ...state.isStreaming, [sessionId]: false },
    })),

  setApprovals: (sessionId, approvals) =>
    set((state) => ({
      approvalsBySession: {
        ...state.approvalsBySession,
        [sessionId]: approvals,
      },
    })),

  addApproval: (sessionId, approval) =>
    set((state) => ({
      approvalsBySession: {
        ...state.approvalsBySession,
        [sessionId]: [...(state.approvalsBySession[sessionId] || []), approval],
      },
    })),

  updateApproval: (sessionId, approvalId, updates) =>
    set((state) => ({
      approvalsBySession: {
        ...state.approvalsBySession,
        [sessionId]: (state.approvalsBySession[sessionId] || []).map((a) =>
          a.id === approvalId ? { ...a, ...updates } : a
        ),
      },
    })),

  getMessages: (sessionId) => get().messagesBySession[sessionId] || [],
  getApprovals: (sessionId) => get().approvalsBySession[sessionId] || [],

  getPendingApproval: (sessionId) =>
    (get().approvalsBySession[sessionId] || []).find(
      (a) => a.status === "pending"
    ),

  clearSession: (sessionId) =>
    set((state) => {
      const { [sessionId]: _messages, ...restMessages } = state.messagesBySession;
      const { [sessionId]: _approvals, ...restApprovals } = state.approvalsBySession;
      const { [sessionId]: _streaming, ...restStreaming } = state.streamingContent;
      const { [sessionId]: _isStreaming, ...restIsStreaming } = state.isStreaming;

      return {
        messagesBySession: restMessages,
        approvalsBySession: restApprovals,
        streamingContent: restStreaming,
        isStreaming: restIsStreaming,
      };
    }),

  reset: () => set(initialState),
}));
