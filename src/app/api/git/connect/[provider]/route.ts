import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  PROVIDER_CONFIG,
  isValidProvider,
  getCallbackUrl,
} from "@/features/git-providers/lib/oauth-config";

// GET /api/git/connect/[provider] - Initiate OAuth flow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider
  if (!isValidProvider(provider)) {
    return NextResponse.json(
      { error: "Invalid provider. Must be github, gitlab, or bitbucket" },
      { status: 400 }
    );
  }

  // Check authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = PROVIDER_CONFIG[provider];

  // Check if client credentials are configured
  if (!config.clientId || !config.clientSecret) {
    return NextResponse.json(
      { error: `${config.name} OAuth is not configured` },
      { status: 500 }
    );
  }

  // Generate state token for CSRF protection
  const state = crypto.randomUUID();

  // Get workspace slug or returnTo from query params for redirect after callback
  const workspaceSlug = request.nextUrl.searchParams.get("workspace") || "";
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "";

  // Store state, workspace, and returnTo in cookie
  const cookieStore = await cookies();
  cookieStore.set("git_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  cookieStore.set("git_oauth_workspace", workspaceSlug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  cookieStore.set("git_oauth_return_to", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  // Build authorization URL
  const authUrl = new URL(config.authorizeUrl);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", getCallbackUrl(provider));
  authUrl.searchParams.set("state", state);

  if (provider === "github") {
    authUrl.searchParams.set("scope", config.scopes.join(" "));
  } else if (provider === "gitlab") {
    authUrl.searchParams.set("scope", config.scopes.join(" "));
    authUrl.searchParams.set("response_type", "code");
  } else if (provider === "bitbucket") {
    // Bitbucket uses different scope format
    authUrl.searchParams.set("scope", config.scopes.join(" "));
    authUrl.searchParams.set("response_type", "code");
  }

  return NextResponse.redirect(authUrl.toString());
}
