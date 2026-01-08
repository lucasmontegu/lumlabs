"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  ProviderCard,
  useConnections,
  type Repository,
  type GitProvider,
} from "@/features/git-providers";

export default function ConnectPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceSlug = params.workspaceSlug as string;

  const { providers, refresh, disconnect, isLoading } = useConnections();

  // Handle OAuth callback status
  useEffect(() => {
    const provider = searchParams.get("provider");
    const status = searchParams.get("status");
    const message = searchParams.get("message");

    if (status === "success" && provider) {
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} connected successfully`);
      // Clean URL
      router.replace(`/w/${workspaceSlug}/connect`);
      refresh();
    } else if (status === "error" && provider) {
      toast.error(message || `Failed to connect ${provider}`);
      router.replace(`/w/${workspaceSlug}/connect`);
    }
  }, [searchParams, router, workspaceSlug, refresh]);

  const handleDisconnect = async (provider: GitProvider) => {
    try {
      await disconnect(provider);
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} disconnected`);
    } catch {
      toast.error(`Failed to disconnect ${provider}`);
    }
  };

  const handleImport = async (
    provider: GitProvider,
    repo: Repository,
    branch: string
  ) => {
    try {
      const response = await fetch("/api/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: repo.name,
          url: repo.url,
          provider,
          defaultBranch: branch,
          slug: workspaceSlug,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to import repository");
      }

      toast.success(`${repo.name} imported successfully`);
      router.push(`/w/${workspaceSlug}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to import repository"
      );
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Link href={`/w/${workspaceSlug}`}>
            <Button variant="ghost" size="icon">
              <HugeiconsIcon icon={ArrowLeft02Icon} className="size-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Connect a Repository</h1>
            <p className="text-sm text-muted-foreground">
              Import a repository from your Git provider to start building
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
          {(["github", "gitlab", "bitbucket"] as const).map((provider) => {
            const providerData = providers.find((p) => p.provider === provider);
            return (
              <ProviderCard
                key={provider}
                provider={provider}
                connected={providerData?.connected || false}
                username={providerData?.username}
                onDisconnect={() => handleDisconnect(provider)}
                onImport={(repo, branch) => handleImport(provider, repo, branch)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
