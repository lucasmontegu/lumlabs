"use client"

import * as React from "react"
import { Tabs, TabsList, TabsTrigger, TabsPanel } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { useChatStore } from "../stores/chat-store"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"

export function ChatContainer() {
  const {
    sessions,
    activeSessionId,
    createSession,
    deleteSession,
    setActiveSession,
    addMessage,
  } = useChatStore()

  // Crear sesión inicial si no hay ninguna
  React.useEffect(() => {
    if (sessions.length === 0) {
      createSession()
    }
  }, [sessions.length, createSession])

  const activeSession = sessions.find((s) => s.id === activeSessionId)

  const handleSendMessage = (content: string) => {
    if (!activeSessionId) return

    // Agregar mensaje del usuario
    addMessage(activeSessionId, {
      role: "user",
      content,
    })

    // Simular respuesta del asistente
    setTimeout(() => {
      addMessage(activeSessionId, {
        role: "assistant",
        content: `Respuesta a: "${content}"`,
      })
    }, 500)
  }

  const handleDeleteTab = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    deleteSession(sessionId)
  }

  if (!activeSession) {
    return null
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tabs Header */}
      <Tabs
        value={activeSessionId ?? undefined}
        onValueChange={(value) => setActiveSession(value as string)}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <TabsList className="flex-1 overflow-x-auto">
            {sessions.map((session) => (
              <TabsTrigger
                key={session.id}
                value={session.id}
                className="group relative pr-8"
              >
                {session.title}
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteTab(e, session.id)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition-opacity hover:bg-muted-foreground/20 group-hover:opacity-100"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                  </button>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={createSession}
          >
            <HugeiconsIcon icon={Add01Icon} />
          </Button>
        </div>

        {/* Chat Content */}
        {sessions.map((session) => (
          <TabsPanel
            key={session.id}
            value={session.id}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <ChatMessages messages={session.messages} />
          </TabsPanel>
        ))}
      </Tabs>

      {/* Fixed Footer Input */}
      <div className="mt-auto border-t border-border bg-background">
        <ChatInput onSend={handleSendMessage} />
      </div>
    </div>
  )
}
