"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  OnboardingProgress,
  RepoSelector,
  type RepoOption,
} from "@/features/onboarding";

interface SelectRepoPageClientProps {
  connectedProviders: string[];
  workspaceSlug: string;
}

export function SelectRepoPageClient({
  connectedProviders,
  workspaceSlug,
}: SelectRepoPageClientProps) {
  const router = useRouter();
  const [selectedRepo, setSelectedRepo] = useState<RepoOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    if (!selectedRepo) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Import the repository to the organization
      const importRes = await fetch("/api/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedRepo.name,
          url: selectedRepo.url,
          provider: selectedRepo.provider,
          defaultBranch: selectedRepo.defaultBranch,
          cloneUrl: selectedRepo.cloneUrl,
        }),
      });

      if (!importRes.ok) {
        const data = await importRes.json();
        throw new Error(data.error || "Failed to import repository");
      }

      const { repository } = await importRes.json();

      // 2. Complete onboarding
      const completeRes = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultRepositoryId: repository.id,
        }),
      });

      if (!completeRes.ok) {
        throw new Error("Failed to complete onboarding");
      }

      // 3. Redirect to workspace
      router.push(`/w/${workspaceSlug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <OnboardingProgress currentStep={2} />

      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Selecciona tu proyecto
        </h1>
        <p className="mt-2 text-muted-foreground">
          Elige el repositorio en el que vas a trabajar
        </p>
      </div>

      <div className="w-full space-y-4">
        <RepoSelector
          connectedProviders={connectedProviders}
          value={selectedRepo}
          onChange={setSelectedRepo}
        />

        {selectedRepo && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-background">
                <RepoIcon className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{selectedRepo.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRepo.owner} / {selectedRepo.defaultBranch}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="w-full rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex w-full flex-col gap-3">
        <Button
          size="lg"
          onClick={handleComplete}
          disabled={!selectedRepo || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Spinner className="size-4" />
              Configurando...
            </>
          ) : (
            "Empezar a construir"
          )}
        </Button>
        <button
          onClick={() => router.push("/onboarding/connect")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Volver a conectar providers
        </button>
      </div>
    </div>
  );
}

function RepoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}
