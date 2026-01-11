"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreHorizontalIcon,
  Edit02Icon,
  Delete02Icon,
  Copy01Icon,
  Tick02Icon,
  Cancel01Icon,
  FlashIcon,
  Settings02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { Skill } from "../types";

interface SkillCardProps {
  skill: Skill;
  onEdit?: (skill: Skill) => void;
  onDelete?: (skill: Skill) => void;
  onDuplicate?: (skill: Skill) => void;
  onToggleActive?: (skill: Skill, isActive: boolean) => void;
  isReadOnly?: boolean;
}

const authorTypeLabels: Record<Skill["authorType"], string> = {
  platform: "Platform",
  organization: "Organization",
  user: "Personal",
};

const authorTypeColors: Record<Skill["authorType"], string> = {
  platform: "bg-blue-500/10 text-blue-500",
  organization: "bg-purple-500/10 text-purple-500",
  user: "bg-green-500/10 text-green-500",
};

export function SkillCard({
  skill,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
  isReadOnly = false,
}: SkillCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleToggleActive = (checked: boolean) => {
    onToggleActive?.(skill, checked);
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-card p-4 transition-all",
        isHovered && "border-primary/50 shadow-sm",
        !skill.isActive && "opacity-60"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-lg",
              skill.isActive ? "bg-primary/10" : "bg-muted"
            )}
          >
            <HugeiconsIcon
              icon={FlashIcon}
              className={cn(
                "size-5",
                skill.isActive ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>

          {/* Title & Type */}
          <div>
            <h3 className="font-medium text-sm">{skill.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant="secondary"
                className={cn("text-[10px] px-1.5 py-0", authorTypeColors[skill.authorType])}
              >
                {authorTypeLabels[skill.authorType]}
              </Badge>
              {skill.version && (
                <span className="text-[10px] text-muted-foreground">
                  v{skill.version}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isReadOnly && onToggleActive && (
            <Switch
              checked={skill.isActive}
              onCheckedChange={handleToggleActive}
              className="scale-75"
            />
          )}

          {!isReadOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(skill)}>
                    <HugeiconsIcon icon={Edit02Icon} className="size-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(skill)}>
                    <HugeiconsIcon icon={Copy01Icon} className="size-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                )}
                {onDelete && skill.authorType !== "platform" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(skill)}
                      className="text-destructive focus:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Description */}
      {skill.description && (
        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
          {skill.description}
        </p>
      )}

      {/* Triggers */}
      {skill.triggers && skill.triggers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {skill.triggers.slice(0, 5).map((trigger) => (
            <Badge
              key={trigger}
              variant="outline"
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {trigger}
            </Badge>
          ))}
          {skill.triggers.length > 5 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              +{skill.triggers.length - 5} more
            </Badge>
          )}
        </div>
      )}

      {/* Content Preview */}
      <div className="mt-3 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground font-mono line-clamp-3">
        {skill.content.slice(0, 150)}
        {skill.content.length > 150 && "..."}
      </div>
    </div>
  );
}

/**
 * Compact variant for lists
 */
export function SkillCardCompact({
  skill,
  onEdit,
  onToggleActive,
  isSelected,
  onSelect,
}: {
  skill: Skill;
  onEdit?: (skill: Skill) => void;
  onToggleActive?: (skill: Skill, isActive: boolean) => void;
  isSelected?: boolean;
  onSelect?: (skill: Skill) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-all cursor-pointer hover:border-primary/50",
        isSelected && "border-primary bg-primary/5",
        !skill.isActive && "opacity-60"
      )}
      onClick={() => onSelect?.(skill)}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-md",
            skill.isActive ? "bg-primary/10" : "bg-muted"
          )}
        >
          <HugeiconsIcon
            icon={FlashIcon}
            className={cn(
              "size-4",
              skill.isActive ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
        <div>
          <span className="font-medium text-sm">{skill.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge
              variant="secondary"
              className={cn("text-[10px] px-1 py-0", authorTypeColors[skill.authorType])}
            >
              {authorTypeLabels[skill.authorType]}
            </Badge>
            {skill.triggers && skill.triggers.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {skill.triggers.length} triggers
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onToggleActive && (
          <Switch
            checked={skill.isActive}
            onCheckedChange={(checked) => onToggleActive(skill, checked)}
            onClick={(e) => e.stopPropagation()}
            className="scale-75"
          />
        )}
        {onEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(skill);
            }}
          >
            <HugeiconsIcon icon={Settings02Icon} className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
