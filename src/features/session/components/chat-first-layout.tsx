"use client";

import * as React from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface ChatFirstLayoutProps {
  chatPanel: React.ReactNode;
  previewPanel?: React.ReactNode;
  showPreview?: boolean;
}

export function ChatFirstLayout({
  chatPanel,
  previewPanel,
  showPreview = false,
}: ChatFirstLayoutProps) {
  // If no preview, show chat full width (EmptyChat has its own layout)
  if (!showPreview || !previewPanel) {
    return (
      <div className="flex h-full flex-1">
        <div className="flex h-full w-full flex-col">{chatPanel}</div>
      </div>
    );
  }

  // Split layout: Chat (30%) | Preview (70%) - resizable
  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      {/* Chat Panel - Left */}
      <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
        <div className="flex h-full flex-col border-r border-border">
          {chatPanel}
        </div>
      </ResizablePanel>

      {/* Resize Handle */}
      <ResizableHandle withHandle />

      {/* Preview Panel - Right */}
      <ResizablePanel defaultSize={70} minSize={40}>
        <div className="flex h-full flex-col">{previewPanel}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
