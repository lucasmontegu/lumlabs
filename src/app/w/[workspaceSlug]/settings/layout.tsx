"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  Building06Icon,
  UserGroupIcon,
  Settings01Icon,
  ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const settingsNav = [
  {
    title: "Account",
    href: "account",
    icon: UserIcon,
    description: "Profile and preferences",
  },
  {
    title: "Organization",
    href: "organization",
    icon: Building06Icon,
    description: "Workspace settings",
  },
  {
    title: "Team",
    href: "team",
    icon: UserGroupIcon,
    description: "Members and invitations",
  },
  {
    title: "Integrations",
    href: "integrations",
    icon: Settings01Icon,
    description: "MCP servers and connections",
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const workspaceSlug = params.workspaceSlug as string;

  const currentSection = pathname.split("/").pop();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b px-6">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href={`/w/${workspaceSlug}`} />}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 shrink-0 border-r bg-muted/30">
          <nav className="flex flex-col gap-1 p-4">
            {settingsNav.map((item) => {
              const isActive = currentSection === item.href;
              return (
                <Link
                  key={item.href}
                  href={`/w/${workspaceSlug}/settings/${item.href}`}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                  )}
                >
                  <HugeiconsIcon
                    icon={item.icon}
                    className={cn(
                      "size-4",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
