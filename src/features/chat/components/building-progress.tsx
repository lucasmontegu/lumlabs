"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Loading03Icon,
  FileEditIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export interface FileChange {
  path: string;
  status: "pending" | "writing" | "done";
}

interface BuildingProgressProps {
  files: FileChange[];
  currentFile?: string;
  isComplete?: boolean;
}

export function BuildingProgress({
  files,
  currentFile,
  isComplete,
}: BuildingProgressProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        {!isComplete ? (
          <>
            <HugeiconsIcon
              icon={Loading03Icon}
              className="size-4 text-primary animate-spin"
            />
            <span className="text-sm font-medium">Building...</span>
          </>
        ) : (
          <>
            <HugeiconsIcon
              icon={Tick01Icon}
              className="size-4 text-green-500"
            />
            <span className="text-sm font-medium text-green-600">
              Build complete
            </span>
          </>
        )}
      </div>

      {/* Current file */}
      {currentFile && !isComplete && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HugeiconsIcon icon={FileEditIcon} className="size-3.5" />
          <span className="font-mono text-xs">{currentFile}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <div
              key={file.path}
              className={cn(
                "flex items-center gap-2 text-xs font-mono",
                file.status === "done" && "text-muted-foreground",
                file.status === "writing" && "text-primary"
              )}
            >
              {file.status === "writing" && (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="size-3 animate-spin"
                />
              )}
              {file.status === "done" && (
                <HugeiconsIcon
                  icon={Tick01Icon}
                  className="size-3 text-green-500"
                />
              )}
              {file.status === "pending" && <span className="size-3" />}
              <span>{file.path.split("/").pop()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
