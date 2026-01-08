"use client";

import { SessionLayout } from "@/features/session";
import { ChatContainer } from "@/features/chat";

export default function SessionPage() {
  return <SessionLayout chatPanel={<ChatContainer />} />;
}
