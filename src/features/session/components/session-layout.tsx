"use client";

import * as React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { SessionTabs } from "./session-tabs";
import { SessionStatusBar } from "./session-status-bar";
import { SessionPreview } from "./session-preview";

interface SessionLayoutProps {
  chatPanel: React.ReactNode;
  onNewSession?: () => void;
}

export function SessionLayout({ chatPanel, onNewSession }: SessionLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <SessionTabs onNewSession={onNewSession} />

      {/* Status bar */}
      <SessionStatusBar />

      {/* Main content */}
      <Group orientation="horizontal" className="flex-1">
        {/* Preview */}
        <Panel defaultSize={55} minSize={30}>
          <SessionPreview />
        </Panel>

        <Separator className="w-1 bg-border hover:bg-primary/20 transition-colors" />

        {/* Chat */}
        <Panel defaultSize={45} minSize={25}>
          {chatPanel}
        </Panel>
      </Group>
    </div>
  );
}
