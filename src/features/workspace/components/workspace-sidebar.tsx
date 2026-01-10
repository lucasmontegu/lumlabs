"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Settings01Icon,
  Home01Icon,
  MessageEdit01Icon,
  SidebarLeftIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSessionStore, FeatureSession } from "@/features/session";
import { useWorkspaceStore } from "../stores/workspace-store";

// Group sessions by relative date
function groupSessionsByDate(sessions: FeatureSession[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: Record<string, FeatureSession[]> = {
    Hoy: [],
    Ayer: [],
    "Esta semana": [],
    "Este mes": [],
    Anterior: [],
  };

  // Sort sessions by updatedAt descending
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  for (const session of sorted) {
    const date = new Date(session.updatedAt);
    if (date >= today) {
      groups["Hoy"].push(session);
    } else if (date >= yesterday) {
      groups["Ayer"].push(session);
    } else if (date >= lastWeek) {
      groups["Esta semana"].push(session);
    } else if (date >= lastMonth) {
      groups["Este mes"].push(session);
    } else {
      groups["Anterior"].push(session);
    }
  }

  return groups;
}

const statusColors = {
  idle: "bg-muted-foreground",
  planning: "bg-yellow-500",
  plan_review: "bg-orange-500",
  building: "bg-blue-500",
  reviewing: "bg-purple-500",
  ready: "bg-green-500",
  error: "bg-red-500",
};

export function WorkspaceSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;
  const sessionId = params.sessionId as string | undefined;

  const { activeWorkspace } = useWorkspaceStore();
  const { sessions, activeSessionId } = useSessionStore();

  const isSettings = pathname.includes("/settings");
  const isHome = pathname === `/w/${workspaceSlug}`;
  const groupedSessions = React.useMemo(
    () => groupSessionsByDate(sessions),
    [sessions]
  );

  return (
    <Sidebar collapsible="icon">
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={`/w/${workspaceSlug}`} />}>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
                L
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">
                  {activeWorkspace?.name || "LumLabs"}
                </span>
                <span className="text-xs text-muted-foreground">Workspace</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Home */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href={`/w/${workspaceSlug}`} />} isActive={isHome}>
                  <HugeiconsIcon icon={Home01Icon} />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sessions by date */}
        {Object.entries(groupedSessions).map(([title, groupSessions]) => {
          if (groupSessions.length === 0) return null;
          return (
            <SidebarGroup key={title}>
              <SidebarGroupLabel>{title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {groupSessions.map((session) => (
                    <SidebarMenuItem key={session.id}>
                      <SidebarMenuButton
                        render={<Link href={`/w/${workspaceSlug}/s/${session.id}`} />}
                        isActive={session.id === sessionId}
                      >
                        <div
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            statusColors[session.status]
                          )}
                        />
                        <span className="truncate">{session.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        {/* Empty state */}
        {sessions.length === 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                <HugeiconsIcon
                  icon={MessageEdit01Icon}
                  className="size-8 text-muted-foreground/50"
                />
                <p className="text-sm text-muted-foreground">
                  No hay sesiones aún
                </p>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href={`/w/${workspaceSlug}/settings`} />} isActive={isSettings}>
              <HugeiconsIcon icon={Settings01Icon} />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// Export collapse trigger for use in header
export function SidebarCollapseButton() {
  return (
    <SidebarTrigger className="size-8">
      <HugeiconsIcon icon={SidebarLeftIcon} className="size-4" />
    </SidebarTrigger>
  );
}
