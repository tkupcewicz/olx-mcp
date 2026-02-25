import type Database from "better-sqlite3";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";

// OAuth client registration

export interface StoredOAuthClient {
  client_id: string;
  client_secret: string | null;
  client_secret_expires_at: number | null;
  redirect_uris: string;
  client_name: string | null;
  grant_types: string;
  response_types: string;
  token_endpoint_auth_method: string;
}

export function getOAuthClient(
  db: Database.Database,
  clientId: string,
): StoredOAuthClient | undefined {
  return db
    .prepare("SELECT * FROM oauth_clients WHERE client_id = ?")
    .get(clientId) as StoredOAuthClient | undefined;
}

export function insertOAuthClient(
  db: Database.Database,
  client: OAuthClientInformationFull,
): void {
  db.prepare(
    `INSERT INTO oauth_clients (client_id, client_secret, client_secret_expires_at, redirect_uris, client_name, grant_types, response_types, token_endpoint_auth_method)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    client.client_id,
    client.client_secret ?? null,
    client.client_secret_expires_at ?? null,
    JSON.stringify(client.redirect_uris),
    client.client_name ?? null,
    (client.grant_types ?? ["authorization_code", "refresh_token"]).join(","),
    (client.response_types ?? ["code"]).join(","),
    client.token_endpoint_auth_method ?? "client_secret_post",
  );
}

export function storedClientToFull(stored: StoredOAuthClient): OAuthClientInformationFull {
  return {
    client_id: stored.client_id,
    client_secret: stored.client_secret ?? undefined,
    client_secret_expires_at: stored.client_secret_expires_at ?? undefined,
    redirect_uris: JSON.parse(stored.redirect_uris),
    client_name: stored.client_name ?? undefined,
    grant_types: stored.grant_types.split(","),
    response_types: stored.response_types.split(","),
    token_endpoint_auth_method: stored.token_endpoint_auth_method,
  } as unknown as OAuthClientInformationFull;
}

// OAuth token storage

export interface StoredToken {
  id: number;
  mcp_client_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
  scopes: string;
}

export function getTokenByAccessToken(
  db: Database.Database,
  accessToken: string,
): StoredToken | undefined {
  return db
    .prepare("SELECT * FROM oauth_tokens WHERE access_token = ?")
    .get(accessToken) as StoredToken | undefined;
}

export function getTokenByClientId(
  db: Database.Database,
  mcpClientId: string,
): StoredToken | undefined {
  return db
    .prepare("SELECT * FROM oauth_tokens WHERE mcp_client_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(mcpClientId) as StoredToken | undefined;
}

export function upsertToken(
  db: Database.Database,
  token: {
    mcpClientId: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: number;
    scopes: string;
  },
): void {
  // Delete old tokens for this client, then insert new one
  db.prepare("DELETE FROM oauth_tokens WHERE mcp_client_id = ?").run(token.mcpClientId);
  db.prepare(
    `INSERT INTO oauth_tokens (mcp_client_id, access_token, refresh_token, expires_at, scopes)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(token.mcpClientId, token.accessToken, token.refreshToken, token.expiresAt, token.scopes);
}

export function deleteTokenByAccessToken(
  db: Database.Database,
  accessToken: string,
): void {
  db.prepare("DELETE FROM oauth_tokens WHERE access_token = ?").run(accessToken);
}

// OAuth auth sessions (temporary state during auth flow)

export interface StoredAuthSession {
  state: string;
  mcp_client_id: string;
  mcp_redirect_uri: string;
  mcp_state: string | null;
  code_challenge: string;
  scopes: string;
}

export function getAuthSession(
  db: Database.Database,
  state: string,
): StoredAuthSession | undefined {
  return db
    .prepare("SELECT * FROM oauth_auth_sessions WHERE state = ?")
    .get(state) as StoredAuthSession | undefined;
}

export function insertAuthSession(
  db: Database.Database,
  session: StoredAuthSession,
): void {
  db.prepare(
    `INSERT INTO oauth_auth_sessions (state, mcp_client_id, mcp_redirect_uri, mcp_state, code_challenge, scopes)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(session.state, session.mcp_client_id, session.mcp_redirect_uri, session.mcp_state, session.code_challenge, session.scopes);
}

export function deleteAuthSession(
  db: Database.Database,
  state: string,
): void {
  db.prepare("DELETE FROM oauth_auth_sessions WHERE state = ?").run(state);
}

// Cleanup expired sessions (older than 10 minutes)
export function cleanupExpiredAuthSessions(db: Database.Database): void {
  db.prepare(
    "DELETE FROM oauth_auth_sessions WHERE created_at < datetime('now', '-10 minutes')",
  ).run();
}
