"use client";

import * as React from "react";
import { useLoadWorkspaceData } from "../hooks/use-load-workspace-data";

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  // This hook loads repositories and workspace data from the API
  useLoadWorkspaceData();

  return <>{children}</>;
}
