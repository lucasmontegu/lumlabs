import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";

export default async function RootPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
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
