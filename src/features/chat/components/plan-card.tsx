"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PlanItem {
  description: string;
  files?: string[];
}

export interface PlanData {
  summary: string;
  changes: PlanItem[];
  considerations?: string[];
}

interface PlanCardProps {
  plan: PlanData;
  status: "pending" | "approved" | "rejected";
  onApprove?: () => void;
  onAdjust?: () => void;
  isLoading?: boolean;
}

export function PlanCard({
  plan,
  status,
  onApprove,
  onAdjust,
  isLoading,
}: PlanCardProps) {
  const isPending = status === "pending";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              className="size-4 text-primary"
            />
          </div>
          <div>
            <p className="text-sm font-medium">Plan Ready</p>
            <p className="text-xs text-muted-foreground">
              Review before building
            </p>
          </div>
        </div>
        {status === "approved" && (
          <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-600">
            <HugeiconsIcon icon={Tick01Icon} className="size-3" />
            Approved
          </span>
        )}
        {status === "rejected" && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-600">
            <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            Adjusting
          </span>
        )}
      </div>

      {/* Summary */}
      <div>
        <p className="text-sm text-foreground">{plan.summary}</p>
      </div>

      {/* Changes */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          What will change
        </p>
        <ul className="space-y-1.5">
          {plan.changes.map((change, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
              <span>{change.description}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Considerations */}
      {plan.considerations && plan.considerations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Considerations
          </p>
          <ul className="space-y-1.5">
            {plan.considerations.map((note, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={onApprove} disabled={isLoading} className="flex-1">
            {isLoading ? "Starting..." : "Looks good, build it"}
          </Button>
          <Button variant="outline" onClick={onAdjust} disabled={isLoading}>
            Adjust
          </Button>
        </div>
      )}
    </div>
  );
}
