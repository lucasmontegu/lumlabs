"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  GitPullRequestIcon,
  ArrowReloadHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

interface ReadyCardProps {
  filesChanged: string[];
  onCreatePR?: () => void;
  onIterate?: () => void;
  isLoading?: boolean;
  prUrl?: string;
}

export function ReadyCard({
  filesChanged,
  onCreatePR,
  onIterate,
  isLoading,
  prUrl,
}: ReadyCardProps) {
  return (
    <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-green-500/10">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            className="size-4 text-green-500"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-green-600">Changes Ready</p>
          <p className="text-xs text-muted-foreground">
            {filesChanged.length} file{filesChanged.length !== 1 ? "s" : ""}{" "}
            modified
          </p>
        </div>
      </div>

      {/* Files changed */}
      {filesChanged.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filesChanged.slice(0, 5).map((file) => (
            <span
              key={file}
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
            >
              {file.split("/").pop()}
            </span>
          ))}
          {filesChanged.length > 5 && (
            <span className="text-xs text-muted-foreground">
              +{filesChanged.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {prUrl ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.open(prUrl, "_blank")}
          >
            <HugeiconsIcon icon={GitPullRequestIcon} className="size-4" />
            View PR
          </Button>
          <Button variant="ghost" onClick={onIterate}>
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              className="size-4"
            />
            Iterate
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button onClick={onCreatePR} disabled={isLoading} className="flex-1">
            <HugeiconsIcon icon={GitPullRequestIcon} className="size-4" />
            {isLoading ? "Creating PR..." : "Create PR"}
          </Button>
          <Button variant="outline" onClick={onIterate} disabled={isLoading}>
            Iterate more
          </Button>
        </div>
      )}
    </div>
  );
}
