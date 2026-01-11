"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, RobotIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { type Mentionable, DEFAULT_AGENTS } from "../lib/mentions";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MentionPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (mention: Mentionable) => void;
  users: Mentionable[];
  searchQuery: string;
  position?: { top: number; left: number };
  children?: React.ReactNode;
}

export function MentionPopover({
  open,
  onOpenChange,
  onSelect,
  users,
  searchQuery,
  children,
}: MentionPopoverProps) {
  const [filteredItems, setFilteredItems] = React.useState<{
    users: Mentionable[];
    agents: Mentionable[];
  }>({ users: [], agents: [] });

  React.useEffect(() => {
    const query = searchQuery.toLowerCase();

    const filteredUsers = users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        (u.type === "user" && u.email?.toLowerCase().includes(query))
    );

    const filteredAgents = DEFAULT_AGENTS.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.agentType.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
    );

    setFilteredItems({ users: filteredUsers, agents: filteredAgents });
  }, [searchQuery, users]);

  const handleSelect = React.useCallback(
    (item: Mentionable) => {
      onSelect(item);
      onOpenChange(false);
    },
    [onSelect, onOpenChange]
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        side="top"
        sideOffset={5}
      >
        <Command>
          <CommandInput placeholder="Search users or agents..." value={searchQuery} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Users group */}
            {filteredItems.users.length > 0 && (
              <CommandGroup heading="Team Members">
                {filteredItems.users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.name}
                    onSelect={() => handleSelect(user)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {user.type === "user" && (
                      <Avatar className="size-6">
                        {user.image ? (
                          <AvatarImage src={user.image} alt={user.name} />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.name}</span>
                      {user.type === "user" && user.email && (
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Agents group */}
            {filteredItems.agents.length > 0 && (
              <CommandGroup heading="AI Agents">
                {filteredItems.agents.map((agent) => (
                  <CommandItem
                    key={agent.id}
                    value={agent.name}
                    onSelect={() => handleSelect(agent)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                      <HugeiconsIcon
                        icon={RobotIcon}
                        className="size-3 text-primary"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{agent.name}</span>
                      {agent.type === "agent" && (
                        <span className="text-xs text-muted-foreground">
                          {agent.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Mention badge component for displaying a mention inline
 */
interface MentionBadgeProps {
  name: string;
  type: "user" | "agent" | "integration";
  onClick?: () => void;
  className?: string;
}

export function MentionBadge({
  name,
  type,
  onClick,
  className,
}: MentionBadgeProps) {
  const Icon = type === "user" ? UserIcon : RobotIcon;

  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer transition-colors",
        type === "user"
          ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
          : "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20",
        className
      )}
    >
      <HugeiconsIcon icon={Icon} className="size-3" />
      {name}
    </span>
  );
}
