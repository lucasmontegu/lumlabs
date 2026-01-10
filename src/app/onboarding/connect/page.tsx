import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, gitConnections, onboardingState, organizations } from "@/db";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/id";
import { ConnectPageClient } from "./page-client";

export default async function OnboardingConnectPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Check if onboarding is already completed
  const [existingOnboarding] = await db
    .select()
    .from(onboardingState)
    .where(eq(onboardingState.userId, session.user.id))
    .limit(1);

  if (existingOnboarding?.step === "completed") {
    // Get the organization slug for redirect
    const orgId = session.session.activeOrganizationId;
    if (orgId) {
      const [org] = await db
        .select({ slug: organizations.slug })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
      if (org) {
        redirect(`/w/${org.slug}`);
      }
    }
    redirect("/");
  }

  // Create onboarding state if doesn't exist
  if (!existingOnboarding) {
    await db.insert(onboardingState).values({
      id: generateId("onb"),
      userId: session.user.id,
      step: "connect",
    });
  }

  // Get connected providers
  const connections = await db
    .select({
      provider: gitConnections.provider,
      username: gitConnections.providerUsername,
    })
    .from(gitConnections)
    .where(eq(gitConnections.userId, session.user.id));

  const connectedProviders = connections.reduce(
    (acc, conn) => {
      acc[conn.provider as "github" | "gitlab" | "bitbucket"] = {
        connected: true,
        username: conn.username,
      };
      return acc;
    },
    {} as Record<string, { connected: boolean; username: string | null }>
  );

  const hasAnyConnection = connections.length > 0;

  return (
    <ConnectPageClient
      connectedProviders={connectedProviders}
      hasAnyConnection={hasAnyConnection}
    />
  );
}
