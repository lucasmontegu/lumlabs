import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, gitConnections, onboardingState } from "@/db";
import { eq } from "drizzle-orm";
import { SelectRepoPageClient } from "./page-client";

export default async function OnboardingSelectRepoPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Check onboarding state
  const [existingOnboarding] = await db
    .select()
    .from(onboardingState)
    .where(eq(onboardingState.userId, session.user.id))
    .limit(1);

  if (existingOnboarding?.step === "completed") {
    // Get the organization slug for redirect
    const orgSlug = session.session.activeOrganizationId || "default";
    redirect(`/w/${orgSlug}`);
  }

  // Get connected providers
  const connections = await db
    .select({
      provider: gitConnections.provider,
    })
    .from(gitConnections)
    .where(eq(gitConnections.userId, session.user.id));

  // If no providers connected, go back to connect step
  if (connections.length === 0) {
    redirect("/onboarding/connect");
  }

  // Update onboarding state to select-repo if needed
  if (existingOnboarding?.step === "connect") {
    await db
      .update(onboardingState)
      .set({ step: "select-repo" })
      .where(eq(onboardingState.userId, session.user.id));
  }

  const connectedProviders = connections.map((c) => c.provider);
  const organizationId = session.session.activeOrganizationId!;

  return (
    <SelectRepoPageClient
      connectedProviders={connectedProviders}
      organizationId={organizationId}
    />
  );
}
