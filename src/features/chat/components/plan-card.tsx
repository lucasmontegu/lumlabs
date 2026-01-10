"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Edit02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  summary: string;
  changes: string[];
  onApprove: () => void;
  onAdjust: () => void;
  isLoading?: boolean;
  className?: string;
}

export function PlanCard({
  summary,
  changes,
  onApprove,
  onAdjust,
  isLoading = false,
  className,
}: PlanCardProps) {
  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-semibold">Plan</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm">{summary}</p>

        {/* Changes list */}
        {changes.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Cambios:
            </p>
            <ul className="space-y-1">
              {changes.map((change, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1 text-primary">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-3 pt-2">
        <Button onClick={onApprove} disabled={isLoading} className="flex-1">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} data-icon="inline-start" />
          Aprobar y construir
        </Button>
        <Button
          variant="outline"
          onClick={onAdjust}
          disabled={isLoading}
          className="flex-1"
        >
          <HugeiconsIcon icon={Edit02Icon} data-icon="inline-start" />
          Ajustar plan
        </Button>
      </CardFooter>
    </Card>
  );
}
