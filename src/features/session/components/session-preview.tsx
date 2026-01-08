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

export function SessionPreview() {
  const { getActiveSession } = useSessionStore();
  const session = getActiveSession();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleRefresh = () => {
    // Refresh the iframe
    const iframe = document.querySelector<HTMLIFrameElement>(
      "#preview-iframe"
    );
    if (iframe) {
      setIsLoading(true);
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

      {/* Preview iframe */}
      <div className="relative flex-1 bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        )}
        <iframe
          id="preview-iframe"
          src={session.previewUrl}
          className="size-full border-0"
          onLoad={() => setIsLoading(false)}
          title="Preview"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
}
