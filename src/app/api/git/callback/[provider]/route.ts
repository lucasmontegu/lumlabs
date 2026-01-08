import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, gitConnections } from "@/db";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/id";
import {
  PROVIDER_CONFIG,
  isValidProvider,
  getCallbackUrl,
  type GitProvider,
} from "@/features/git-providers/lib/oauth-config";

async function exchangeCodeForToken(
  provider: GitProvider,
  code: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string;
}> {
  const config = PROVIDER_CONFIG[provider];

  if (provider === "github") {
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: getCallbackUrl(provider),
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    return {
      accessToken: data.access_token,
      scopes: data.scope,
    };
  }

  if (provider === "gitlab") {
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: getCallbackUrl(provider),
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scopes: data.scope,
    };
  }

  if (provider === "bitbucket") {
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${config.clientId}:${config.clientSecret}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: getCallbackUrl(provider),
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scopes: data.scopes,
    };
  }

  throw new Error("Unsupported provider");
}

async function getProviderUser(
  provider: GitProvider,
  accessToken: string
): Promise<{ id: string; username: string }> {
  const config = PROVIDER_CONFIG[provider];

  const response = await fetch(config.userUrl, {
    headers: {
      Authorization:
        provider === "bitbucket"
          ? `Bearer ${accessToken}`
          : `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();

  if (provider === "github") {
    return { id: String(data.id), username: data.login };
  }

  if (provider === "gitlab") {
    return { id: String(data.id), username: data.username };
  }

  if (provider === "bitbucket") {
    return { id: data.uuid, username: data.username };
  }

  throw new Error("Unsupported provider");
}

// GET /api/git/callback/[provider] - Handle OAuth callback
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider
  if (!isValidProvider(provider)) {
    return NextResponse.redirect(
      new URL("/error?message=Invalid+provider", request.url)
    );
  }

  // Check authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("git_oauth_state")?.value;
  const workspaceSlug = cookieStore.get("git_oauth_workspace")?.value || "";
  const returnTo = cookieStore.get("git_oauth_return_to")?.value || "";

  // Get query params
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  // Build redirect URL - prefer returnTo, then workspace, then root
  const redirectUrl = returnTo
    ? returnTo
    : workspaceSlug
      ? `/w/${workspaceSlug}/connect`
      : "/";

  // Handle OAuth errors
  if (error) {
    const errorDescription = request.nextUrl.searchParams.get(
      "error_description"
    );
    return NextResponse.redirect(
      new URL(
        `${redirectUrl}?provider=${provider}&status=error&message=${encodeURIComponent(
          errorDescription || error
        )}`,
        request.url
      )
    );
  }

  // Validate state
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      new URL(
        `${redirectUrl}?provider=${provider}&status=error&message=Invalid+state`,
        request.url
      )
    );
  }

  // Validate code
  if (!code) {
    return NextResponse.redirect(
      new URL(
        `${redirectUrl}?provider=${provider}&status=error&message=No+code+provided`,
        request.url
      )
    );
  }

  try {
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(provider, code);

    // Get provider user info
    const providerUser = await getProviderUser(provider, tokenData.accessToken);

    // Check if connection already exists
    const existingConnection = await db.query.gitConnections.findFirst({
      where: and(
        eq(gitConnections.userId, session.user.id),
        eq(gitConnections.provider, provider)
      ),
    });

    if (existingConnection) {
      // Update existing connection
      await db
        .update(gitConnections)
        .set({
          providerAccountId: providerUser.id,
          providerUsername: providerUser.username,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiresAt: tokenData.expiresAt,
          scopes: tokenData.scopes,
          connectedAt: new Date(),
        })
        .where(eq(gitConnections.id, existingConnection.id));
    } else {
      // Create new connection
      await db.insert(gitConnections).values({
        id: generateId("gitc"),
        userId: session.user.id,
        provider,
        providerAccountId: providerUser.id,
        providerUsername: providerUser.username,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiresAt: tokenData.expiresAt,
        scopes: tokenData.scopes,
        connectedAt: new Date(),
      });
    }

    // Clear OAuth cookies
    cookieStore.delete("git_oauth_state");
    cookieStore.delete("git_oauth_workspace");
    cookieStore.delete("git_oauth_return_to");

    // Redirect to connect page with success
    return NextResponse.redirect(
      new URL(
        `${redirectUrl}?provider=${provider}&status=success`,
        request.url
      )
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to connect provider";

    return NextResponse.redirect(
      new URL(
        `${redirectUrl}?provider=${provider}&status=error&message=${encodeURIComponent(
          message
        )}`,
        request.url
      )
    );
  }
}
