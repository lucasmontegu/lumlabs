"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  OnboardingProgress,
  ProviderConnectCard,
} from "@/features/onboarding";

interface ConnectPageClientProps {
  connectedProviders: Record<
    string,
    { connected: boolean; username: string | null }
  >;
  hasAnyConnection: boolean;
}

export function ConnectPageClient({
  connectedProviders,
  hasAnyConnection,
}: ConnectPageClientProps) {
  const router = useRouter();

  const handleContinue = () => {
    router.push("/onboarding/select-repo");
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <OnboardingProgress currentStep={1} />

      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Conecta tu codigo
        </h1>
        <p className="mt-2 text-muted-foreground">
          Elige donde esta tu repositorio para empezar a construir
        </p>
      </div>

      <div className="grid w-full grid-cols-3 gap-4">
        <ProviderConnectCard
          provider="github"
          connected={connectedProviders.github?.connected || false}
          username={connectedProviders.github?.username}
        />
        <ProviderConnectCard
          provider="gitlab"
          connected={connectedProviders.gitlab?.connected || false}
          username={connectedProviders.gitlab?.username}
        />
        <ProviderConnectCard
          provider="bitbucket"
          connected={connectedProviders.bitbucket?.connected || false}
          username={connectedProviders.bitbucket?.username}
        />
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!hasAnyConnection}
          className="w-full"
        >
          Continuar
        </Button>
        {!hasAnyConnection && (
          <p className="text-center text-sm text-muted-foreground">
            Conecta al menos un proveedor para continuar
          </p>
        )}
      </div>
    </div>
  );
}
