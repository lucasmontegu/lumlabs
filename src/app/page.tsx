import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, onboardingState } from "@/db";
import { eq } from "drizzle-orm";

export default async function RootPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Check onboarding state
  const [userOnboarding] = await db
    .select()
    .from(onboardingState)
    .where(eq(onboardingState.userId, session.user.id))
    .limit(1);

  // If no onboarding record or not completed, go to onboarding
  if (!userOnboarding || userOnboarding.step !== "completed") {
    const step = userOnboarding?.step || "connect";
    redirect(`/onboarding/${step === "select-repo" ? "select-repo" : "connect"}`);
  }

  // Get user's first organization
  const userOrgs = await db.query.members.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user.id),
    with: {
      organizations: true,
    },
  });

  if (userOrgs?.organizations) {
    redirect(`/w/${userOrgs.organizations.slug}`);
  }

  // Fallback to login if no org found (shouldn't happen with auto-create)
  redirect("/login");
}
