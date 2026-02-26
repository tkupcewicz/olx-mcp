import crypto from "node:crypto";
import type { Response } from "express";
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { OAuthClientInformationFull, OAuthTokens, OAuthTokenRevocationRequest } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { getDb } from "../db/database.js";
import {
  getOAuthClient,
  insertOAuthClient,
  storedClientToFull,
  getTokenByAccessToken,
  upsertToken,
  deleteTokenByAccessToken,
  getAuthSession,
  insertAuthSession,
  deleteAuthSession,
  cleanupExpiredAuthSessions,
} from "../db/auth-queries.js";
import {
  OLX_CLIENT_ID,
  OLX_CLIENT_SECRET,
  MCP_SERVER_URL,
  DEFAULT_COUNTRY,
  getCountryConfig,
} from "../config.js";

export class OlxOAuthProvider implements OAuthServerProvider {
  get clientsStore(): OAuthRegisteredClientsStore {
    return {
      getClient: (clientId: string) => {
        const db = getDb();
        const stored = getOAuthClient(db, clientId);
        if (!stored) return undefined;
        return storedClientToFull(stored);
      },

      registerClient: (client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">) => {
        const db = getDb();
        const clientId = crypto.randomUUID();
        const clientSecret = crypto.randomBytes(32).toString("hex");

        const full: OAuthClientInformationFull = {
          ...client,
          client_id: clientId,
          client_secret: clientSecret,
          client_id_issued_at: Math.floor(Date.now() / 1000),
          client_secret_expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
        } as OAuthClientInformationFull;

        insertOAuthClient(db, full);
        return full;
      },
    };
  }

  skipLocalPkceValidation = true;

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    const db = getDb();

    // Clean up old sessions
    cleanupExpiredAuthSessions(db);

    // Generate a unique state for the upstream OLX auth
    const upstreamState = crypto.randomBytes(16).toString("hex");

    // Store the mapping: upstream state → MCP client info (including original MCP state)
    insertAuthSession(db, {
      state: upstreamState,
      mcp_client_id: client.client_id,
      mcp_redirect_uri: params.redirectUri,
      mcp_state: params.state ?? null,
      code_challenge: params.codeChallenge,
      scopes: (params.scopes ?? []).join(" "),
    });

    // Build the OLX authorization URL
    const config = getCountryConfig(DEFAULT_COUNTRY);
    const authUrl = new URL(config.authorizationUrl);
    authUrl.searchParams.set("client_id", OLX_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", `${MCP_SERVER_URL}/oauth/callback`);
    authUrl.searchParams.set("state", upstreamState);
    authUrl.searchParams.set("scope", (params.scopes ?? []).join(" ") || "read write v2");

    res.redirect(authUrl.toString());
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    // skipLocalPkceValidation is true, so this is a no-op.
    // The upstream OLX server handles actual PKCE validation.
    return authorizationCode;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    _resource?: URL,
  ): Promise<OAuthTokens> {
    const config = getCountryConfig(DEFAULT_COUNTRY);

    // Exchange the authorization code at OLX's token endpoint
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: OLX_CLIENT_ID,
      client_secret: OLX_CLIENT_SECRET,
      code: authorizationCode,
      redirect_uri: `${MCP_SERVER_URL}/oauth/callback`,
    });

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`OLX token exchange failed (${response.status}): ${text.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    };

    const expiresIn = data.expires_in ?? 3600;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    // Store the token mapped to the MCP client
    const db = getDb();
    upsertToken(db, {
      mcpClientId: client.client_id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt,
      scopes: data.scope ?? "",
    });

    return {
      access_token: data.access_token,
      token_type: data.token_type ?? "Bearer",
      expires_in: expiresIn,
      refresh_token: data.refresh_token,
      scope: data.scope,
    };
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    _resource?: URL,
  ): Promise<OAuthTokens> {
    const config = getCountryConfig(DEFAULT_COUNTRY);

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: OLX_CLIENT_ID,
      client_secret: OLX_CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    if (scopes && scopes.length > 0) {
      body.set("scope", scopes.join(" "));
    }

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`OLX token refresh failed (${response.status}): ${text.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    };

    const expiresIn = data.expires_in ?? 3600;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    const db = getDb();
    upsertToken(db, {
      mcpClientId: client.client_id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt,
      scopes: data.scope ?? "",
    });

    return {
      access_token: data.access_token,
      token_type: data.token_type ?? "Bearer",
      expires_in: expiresIn,
      refresh_token: data.refresh_token ?? refreshToken,
      scope: data.scope,
    };
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const db = getDb();
    const stored = getTokenByAccessToken(db, token);

    if (!stored) {
      throw new Error("Invalid or unknown access token");
    }

    const now = Math.floor(Date.now() / 1000);

    if (stored.expires_at <= now) {
      // Let the MCP client handle refresh via the /token endpoint
      // with grant_type=refresh_token (standard OAuth 2.1 flow)
      throw new Error("Access token expired");
    }

    return {
      token: stored.access_token,
      clientId: stored.mcp_client_id,
      scopes: stored.scopes.split(" ").filter(Boolean),
      expiresAt: stored.expires_at,
    };
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    const db = getDb();
    deleteTokenByAccessToken(db, request.token);
  }
}

// Handle the OLX OAuth callback — maps back to the MCP client's redirect
export function handleOAuthCallback(
  code: string,
  state: string,
): { redirectUrl: string } {
  const db = getDb();
  const session = getAuthSession(db, state);

  if (!session) {
    throw new Error("Unknown or expired OAuth state");
  }

  // Clean up the session
  deleteAuthSession(db, state);

  // Redirect back to the MCP client with the authorization code
  // and the MCP client's original state (not the upstream OLX state)
  const redirectUrl = new URL(session.mcp_redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (session.mcp_state) {
    redirectUrl.searchParams.set("state", session.mcp_state);
  }

  return { redirectUrl: redirectUrl.toString() };
}
