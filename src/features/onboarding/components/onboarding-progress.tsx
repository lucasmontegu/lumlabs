"use client";

import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  currentStep: 1 | 2;
  totalSteps?: number;
}

export function OnboardingProgress({
  currentStep,
  totalSteps = 2,
}: OnboardingProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
              step === currentStep
                ? "bg-primary text-primary-foreground"
                : step < currentStep
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {step < currentStep ? (
              <CheckIcon className="size-4" />
            ) : (
              step
            )}
          </div>
          {step < totalSteps && (
            <div
              className={cn(
                "h-0.5 w-8 transition-colors",
                step < currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
