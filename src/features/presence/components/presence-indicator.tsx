"use client";

import { cn } from "@/lib/utils";

interface PresenceIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
};

export function PresenceIndicator({
  isOnline,
  size = "md",
  className,
}: PresenceIndicatorProps) {
  return (
    <div
      className={cn(
        "rounded-full",
        sizeClasses[size],
        isOnline
          ? "bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]"
          : "bg-muted-foreground",
        className
      )}
      title={isOnline ? "Online" : "Offline"}
    />
  );
}
