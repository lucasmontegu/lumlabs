"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ReloadIcon,
  Share01Icon,
  FullScreenIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "../stores/session-store";

interface PreviewState {
  isLoading: boolean;
  url: string | null;
}

export function SessionPreview() {
  const { getActiveSession, activeSessionId } = useSessionStore();
  const session = getActiveSession();

  // Track loading state per session
  const [previewStates, setPreviewStates] = React.useState<
    Record<string, PreviewState>
  >({});

  const iframeRefs = React.useRef<Record<string, HTMLIFrameElement | null>>({});

  const currentState = activeSessionId
    ? previewStates[activeSessionId] || { isLoading: false, url: session?.previewUrl || null }
    : { isLoading: false, url: null };

  const handleRefresh = () => {
    if (!activeSessionId) return;

    const iframe = iframeRefs.current[activeSessionId];
    if (iframe && iframe.src) {
      setPreviewStates((prev) => ({
        ...prev,
        [activeSessionId]: { ...prev[activeSessionId], isLoading: true },
      }));
      iframe.src = iframe.src;
    }
  };

  const handleOpenExternal = () => {
    if (session?.previewUrl) {
      window.open(session.previewUrl, "_blank");
    }
  };

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted/30 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon
            icon={PlayIcon}
            className="size-8 text-muted-foreground"
          />
        </div>
        <div>
          <p className="font-medium">No active session</p>
          <p className="text-sm text-muted-foreground">
            Select or create a session to see the preview.
          </p>
        </div>
      </div>
    );
  }

  // No preview URL yet
  if (!session.previewUrl) {
    return (
      <div className="flex h-full flex-col">
        {/* Toolbar */}
        <div className="flex h-10 items-center justify-between border-b border-border bg-muted/30 px-4">
          <span className="text-sm text-muted-foreground">Preview</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-xs" disabled>
              <HugeiconsIcon icon={ReloadIcon} className="size-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" disabled>
              <HugeiconsIcon icon={Share01Icon} className="size-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" disabled>
              <HugeiconsIcon icon={FullScreenIcon} className="size-3" />
            </Button>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-muted/10 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon
              icon={PlayIcon}
              className="size-8 text-muted-foreground"
            />
          </div>
          <div>
            <p className="font-medium">Preview not ready</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              The preview will appear here once the sandbox is running and the
              dev server starts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleIframeLoad = (sessionId: string) => {
    setPreviewStates((prev) => ({
      ...prev,
      [sessionId]: { ...prev[sessionId], isLoading: false },
    }));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex h-10 items-center justify-between border-b border-border bg-muted/30 px-4">
        <span className="truncate text-sm text-muted-foreground">
          {session.previewUrl}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs" onClick={handleRefresh}>
            <HugeiconsIcon icon={ReloadIcon} className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={handleOpenExternal}>
            <HugeiconsIcon icon={Share01Icon} className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-xs">
            <HugeiconsIcon icon={FullScreenIcon} className="size-3" />
          </Button>
        </div>
      </div>

      {/* Preview iframe - keyed by session for state preservation */}
      <div className="relative flex-1 bg-white">
        {currentState.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        )}
        <iframe
          key={session.id}
          ref={(el) => {
            iframeRefs.current[session.id] = el;
          }}
          src={session.previewUrl}
          className="size-full border-0"
          onLoad={() => handleIframeLoad(session.id)}
          title={`Preview - ${session.name}`}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
}
