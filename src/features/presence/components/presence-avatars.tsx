"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PresenceMember {
  clientId: string;
  data: {
    userId: string;
    userName?: string;
    userImage?: string;
  };
}

interface PresenceAvatarsProps {
  members: PresenceMember[];
  maxDisplay?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-6 text-xs",
  md: "size-8 text-sm",
  lg: "size-10 text-base",
};

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({
  member,
  size,
}: {
  member: PresenceMember;
  size: "sm" | "md" | "lg";
}) {
  const { userImage, userName } = member.data;

  if (userImage) {
    return (
      <img
        src={userImage}
        alt={userName || "User"}
        className={cn(
          "rounded-full border-2 border-background object-cover",
          sizeClasses[size]
        )}
        title={userName}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full border-2 border-background bg-primary font-medium text-primary-foreground",
        sizeClasses[size]
      )}
      title={userName}
    >
      {getInitials(userName)}
    </div>
  );
}

export function PresenceAvatars({
  members,
  maxDisplay = 4,
  size = "md",
  className,
}: PresenceAvatarsProps) {
  const displayMembers = members.slice(0, maxDisplay);
  const overflow = members.length - maxDisplay;

  if (members.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {displayMembers.map((member) => (
        <Avatar key={member.clientId} member={member} size={size} />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-muted-foreground",
            sizeClasses[size]
          )}
          title={`${overflow} more`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
