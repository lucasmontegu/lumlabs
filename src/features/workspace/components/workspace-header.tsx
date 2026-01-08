"use client";

import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification02Icon, UserIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

interface WorkspaceHeaderProps {
  title?: string;
  children?: React.ReactNode;
}

export function WorkspaceHeader({ title, children }: WorkspaceHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-lg font-semibold">{title}</h1>}
        {children}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm">
          <HugeiconsIcon icon={Notification02Icon} className="size-4" />
        </Button>
        <Link href="/settings/profile">
          <Button variant="ghost" size="icon-sm">
            <HugeiconsIcon icon={UserIcon} className="size-4" />
          </Button>
        </Link>
      </div>
    </header>
  );
}
