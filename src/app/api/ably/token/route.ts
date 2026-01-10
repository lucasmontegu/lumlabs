import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ablyServer } from "@/lib/ably";
import type { capabilityOp } from "ably";

// POST /api/ably/token - Generate Ably token for authenticated user
export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.session.activeOrganizationId;

    // Build capabilities based on user's organization
    const capability: Record<string, capabilityOp[]> = {
      // Allow subscribing to session channels
      "session:*:stream": ["subscribe"],
      "session:*:status": ["subscribe"],
      "session:*:approvals": ["subscribe"],
      // Allow publishing and subscribing to chat channels (for realtime messaging)
      "session:*:chat": ["publish", "subscribe"],
    };

    // If user has an active organization, allow presence
    if (organizationId) {
      capability[`workspace:${organizationId}:presence`] = [
        "presence",
        "subscribe",
        "publish",
      ];
      // Allow notifications for mentions
      capability[`user:${session.user.id}:notifications`] = ["subscribe"];
    }

    // Generate token request with user ID as client ID
    const tokenRequest = await ablyServer.createTokenRequest(
      session.user.id,
      capability
    );

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("Error generating Ably token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
