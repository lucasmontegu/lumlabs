import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { WorkspaceSidebar, WorkspaceProvider } from "@/features/workspace";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SessionTabsBar } from "@/features/session";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <WorkspaceSidebar />
        <SidebarInset>
          <SessionTabsBar />
          <main className="flex flex-1 flex-col overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </WorkspaceProvider>
  );
}
