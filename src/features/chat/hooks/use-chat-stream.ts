import { useCallback, useRef } from "react";
import { useChatStore, type Message } from "../stores/chat-store";

interface StreamEvent {
  type: "start" | "chunk" | "tool_call" | "tool_result" | "error" | "done";
  content?: string;
  messageId?: string;
  toolCall?: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: string;
  };
  error?: string;
}

interface UseChatStreamOptions {
  sessionId: string;
  onToolCall?: (toolCall: StreamEvent["toolCall"]) => void;
  onError?: (error: string) => void;
  onComplete?: (message: Message) => void;
}

export function useChatStream({
  sessionId,
  onToolCall,
  onError,
  onComplete,
}: UseChatStreamOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const {
    isStreaming,
    streamingContent,
    startStreaming,
    appendStreamContent,
    finishStreaming,
  } = useChatStore();

  const sendMessage = useCallback(
    async (content: string, systemPrompt?: string) => {
      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Note: User message should be added by the caller (ChatContainer)
      // to include additional metadata like mentions and userId

      // Start streaming state
      startStreaming(sessionId);

      let assistantMessageId = "";
      let fullContent = "";

      try {
        const response = await fetch(`/api/sessions/${sessionId}/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content, systemPrompt }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              try {
                const event = JSON.parse(data) as StreamEvent;

                switch (event.type) {
                  case "start":
                    assistantMessageId = event.messageId || "";
                    break;

                  case "chunk":
                    if (event.content) {
                      fullContent += event.content;
                      appendStreamContent(sessionId, event.content);
                    }
                    break;

                  case "tool_call":
                    if (event.toolCall && onToolCall) {
                      onToolCall(event.toolCall);
                    }
                    break;

                  case "tool_result":
                    if (event.toolCall && onToolCall) {
                      onToolCall(event.toolCall);
                    }
                    break;

                  case "error":
                    if (event.error) {
                      onError?.(event.error);
                    }
                    break;

                  case "done":
                    // Create final message
                    const finalMessage: Message = {
                      id: assistantMessageId || `msg-${Date.now()}`,
                      sessionId,
                      role: "assistant",
                      content: fullContent,
                      createdAt: new Date(),
                    };
                    finishStreaming(sessionId, finalMessage);
                    onComplete?.(finalMessage);
                    return;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // Request was cancelled
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        onError?.(errorMessage);

        // Finish streaming even on error
        finishStreaming(sessionId, {
          id: `error-${Date.now()}`,
          sessionId,
          role: "assistant",
          content: `Error: ${errorMessage}`,
          createdAt: new Date(),
        });
      }
    },
    [
      sessionId,
      startStreaming,
      appendStreamContent,
      finishStreaming,
      onToolCall,
      onError,
      onComplete,
    ]
  );

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Also call server-side cancel
    fetch(`/api/sessions/${sessionId}/opencode/cancel`, {
      method: "POST",
    }).catch(() => {
      // Ignore errors
    });
  }, [sessionId]);

  return {
    sendMessage,
    cancelStream,
    isStreaming: isStreaming[sessionId] || false,
    streamingContent: streamingContent[sessionId] || "",
  };
}
