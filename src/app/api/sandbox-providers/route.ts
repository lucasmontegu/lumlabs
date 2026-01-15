import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getSandboxProviderInfo,
  getSandboxProviderConfig,
  setDefaultSandboxProvider,
  type SandboxProviderType,
} from "@/lib/sandbox-provider";

// GET /api/sandbox-providers - Get available sandbox providers
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const providers = getSandboxProviderInfo();
    const config = getSandboxProviderConfig();

    return NextResponse.json({
      providers,
      defaultProvider: config.defaultProvider,
    });
  } catch (error) {
    console.error("Error getting sandbox providers:", error);
    return NextResponse.json(
      { error: "Failed to get sandbox providers" },
      { status: 500 }
    );
  }
}

// PATCH /api/sandbox-providers - Set default sandbox provider
export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { provider } = body as { provider: SandboxProviderType };

    if (!provider) {
      return NextResponse.json(
        { error: "provider is required" },
        { status: 400 }
      );
    }

    try {
      setDefaultSandboxProvider(provider);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid provider" },
        { status: 400 }
      );
    }

    const config = getSandboxProviderConfig();

    return NextResponse.json({
      defaultProvider: config.defaultProvider,
      message: `Default provider set to ${provider}`,
    });
  } catch (error) {
    console.error("Error setting default sandbox provider:", error);
    return NextResponse.json(
      { error: "Failed to set default sandbox provider" },
      { status: 500 }
    );
  }
}
