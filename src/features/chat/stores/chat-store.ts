import { create } from "zustand"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

interface ChatStore {
  sessions: ChatSession[]
  activeSessionId: string | null

  // Actions
  createSession: () => string
  deleteSession: (sessionId: string) => void
  setActiveSession: (sessionId: string) => void
  addMessage: (sessionId: string, message: Omit<Message, "id" | "createdAt">) => void
  updateSessionTitle: (sessionId: string, title: string) => void
}

const generateId = () => Math.random().toString(36).substring(2, 9)

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,

  createSession: () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: `Chat ${get().sessions.length + 1}`,
      messages: [],
      createdAt: new Date(),
    }

    set((state) => ({
      sessions: [...state.sessions, newSession],
      activeSessionId: newSession.id,
    }))

    return newSession.id
  },

  deleteSession: (sessionId) => {
    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== sessionId)
      const newActiveId = state.activeSessionId === sessionId
        ? newSessions[newSessions.length - 1]?.id ?? null
        : state.activeSessionId

      return {
        sessions: newSessions,
        activeSessionId: newActiveId,
      }
    })
  },

  setActiveSession: (sessionId) => {
    set({ activeSessionId: sessionId })
  },

  addMessage: (sessionId, message) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      createdAt: new Date(),
    }

    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, newMessage] }
          : session
      ),
    }))
  },

  updateSessionTitle: (sessionId, title) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, title } : session
      ),
    }))
  },
}))
