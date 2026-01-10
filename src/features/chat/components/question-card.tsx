"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuestionOption {
  id: string;
  label: string;
}

interface QuestionCardProps {
  question: string;
  options: QuestionOption[];
  onSelectOption: (optionId: string, label: string) => void;
  selectedOptionId?: string | null;
  className?: string;
}

export function QuestionCard({
  question,
  options,
  onSelectOption,
  selectedOptionId,
  className,
}: QuestionCardProps) {
  return (
    <Card className={cn("border-border bg-muted/30", className)}>
      <CardHeader className="pb-2">
        <p className="text-sm">{question}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelectOption(option.id, option.label)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all",
              selectedOptionId === option.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:border-primary/50 hover:bg-accent/50"
            )}
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                selectedOptionId === option.id
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/40"
              )}
            >
              {selectedOptionId === option.id && (
                <span className="size-1.5 rounded-full bg-white" />
              )}
            </span>
            <span>{option.label}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
