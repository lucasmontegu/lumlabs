import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, gitConnections, onboardingState, organizations } from "@/db";
import { eq } from "drizzle-orm";
import { SelectRepoPageClient } from "./page-client";

export default async function OnboardingSelectRepoPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Get the organization slug
  const orgId = session.session.activeOrganizationId;
  let workspaceSlug: string | null = null;

  if (orgId) {
    const [org] = await db
      .select({ slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    workspaceSlug = org?.slug ?? null;
  }

  if (!workspaceSlug) {
    redirect("/");
  }

  // Check onboarding state
  const [existingOnboarding] = await db
    .select()
    .from(onboardingState)
    .where(eq(onboardingState.userId, session.user.id))
    .limit(1);

  if (existingOnboarding?.step === "completed") {
    redirect(`/w/${workspaceSlug}`);
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

  return (
    <SelectRepoPageClient
      connectedProviders={connectedProviders}
      workspaceSlug={workspaceSlug}
    />
  );
}
