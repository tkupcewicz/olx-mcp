import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

interface HasAuthInfo {
  authInfo?: AuthInfo;
}

export function getAccessToken(extra: HasAuthInfo): string {
  const authInfo = extra.authInfo;
  if (!authInfo) {
    throw new Error(
      "Authentication required. This tool requires you to be logged in with your OLX account. " +
      "Please connect via the HTTP transport and complete the OAuth login flow.",
    );
  }
  return authInfo.token;
}

export function requireAuth(extra: HasAuthInfo): AuthInfo {
  const authInfo = extra.authInfo;
  if (!authInfo) {
    throw new Error(
      "Authentication required. This tool requires you to be logged in with your OLX account. " +
      "Please connect via the HTTP transport and complete the OAuth login flow.",
    );
  }
  return authInfo;
}
