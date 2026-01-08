"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Home01Icon,
  Settings01Icon,
  UserGroupIcon,
  Add01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWorkspaceStore, Repository } from "../stores/workspace-store";

interface SidebarItemProps {
  href: string;
  icon: IconSvgElement;
  label: string;
  isActive?: boolean;
}

function SidebarItem({ href, icon, label, isActive }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <HugeiconsIcon icon={icon} className="size-4" />
      <span>{label}</span>
    </Link>
  );
}

function RepositoryItem({
  repo,
  workspaceSlug,
  isActive,
}: {
  repo: Repository;
  workspaceSlug: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={`/w/${workspaceSlug}?repo=${repo.id}`}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <div className="flex size-4 items-center justify-center rounded bg-muted-foreground/20 text-[10px] font-medium uppercase">
        {repo.name.charAt(0)}
      </div>
      <span className="flex-1 truncate">{repo.name}</span>
      {repo.sessionCount > 0 && (
        <span className="text-xs text-muted-foreground">
          {repo.sessionCount}
        </span>
      )}
    </Link>
  );
}

export function WorkspaceSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const workspaceSlug = params.workspaceSlug as string;
  const { activeWorkspace, repositories } = useWorkspaceStore();

  const isSettings = pathname.includes("/settings");
  const isDashboard = pathname === `/w/${workspaceSlug}`;

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-background">
      {/* Logo / Workspace selector */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
          L
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {activeWorkspace?.name || "LumLabs"}
          </span>
          <span className="text-xs text-muted-foreground">Workspace</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <SidebarItem
          href={`/w/${workspaceSlug}`}
          icon={Home01Icon}
          label="Dashboard"
          isActive={isDashboard}
        />

        <Separator className="my-3" />

        {/* Repositories section */}
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Projects
          </span>
          <Link href={`/w/${workspaceSlug}/connect`}>
            <Button variant="ghost" size="icon-xs">
              <HugeiconsIcon icon={Add01Icon} className="size-3" />
            </Button>
          </Link>
        </div>

        <div className="flex flex-col gap-0.5">
          {repositories.map((repo) => (
            <RepositoryItem
              key={repo.id}
              repo={repo}
              workspaceSlug={workspaceSlug}
              isActive={false}
            />
          ))}
          {repositories.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No projects connected yet.
            </p>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-1 border-t border-border p-3">
        <SidebarItem
          href={`/w/${workspaceSlug}/team`}
          icon={UserGroupIcon}
          label="Team"
        />
        <SidebarItem
          href={`/w/${workspaceSlug}/settings`}
          icon={Settings01Icon}
          label="Settings"
          isActive={isSettings}
        />
      </div>
    </aside>
  );
}
