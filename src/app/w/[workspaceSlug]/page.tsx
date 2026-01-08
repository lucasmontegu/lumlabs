import { WorkspaceDashboard, WorkspaceHeader } from "@/features/workspace";

export default function WorkspacePage() {
  return (
    <>
      <WorkspaceHeader title="Dashboard" />
      <WorkspaceDashboard />
    </>
  );
}
