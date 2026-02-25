import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { OlxClient } from "./api/client.js";
import { RateLimiterPool } from "./api/rate-limiter.js";
import {
  RATE_LIMIT_CAPACITY,
  RATE_LIMIT_WINDOW_MS,
  MCP_SERVER_URL,
  MCP_HTTP_PORT,
} from "./config.js";
import { getDb, closeDb } from "./db/database.js";
import { createServer } from "./server.js";
import { OlxOAuthProvider, handleOAuthCallback } from "./auth/oauth-provider.js";
import { loadEnv } from "./watcher/env.js";

async function main(): Promise<void> {
  loadEnv();
  getDb();

  const rateLimiters = new RateLimiterPool(RATE_LIMIT_CAPACITY, RATE_LIMIT_WINDOW_MS);
  const client = new OlxClient(rateLimiters);

  const oauthProvider = new OlxOAuthProvider();

  const app = express();

  // OAuth auth router — handles /authorize, /token, /register, /.well-known/*
  const serverUrl = new URL(MCP_SERVER_URL);
  app.use(
    mcpAuthRouter({
      provider: oauthProvider,
      issuerUrl: serverUrl,
      baseUrl: serverUrl,
      scopesSupported: ["read", "write", "v2"],
      resourceName: "OLX MCP Server",
    }),
  );

  // OAuth callback from OLX — receives the authorization code and redirects back to MCP client
  app.get("/oauth/callback", (req, res) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;

    if (error) {
      res.status(400).json({ error, error_description: req.query.error_description });
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: "Missing code or state parameter" });
      return;
    }

    try {
      const { redirectUrl } = handleOAuthCallback(code, state);
      res.redirect(redirectUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: "callback_failed", error_description: message });
    }
  });

  // Session management for Streamable HTTP
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  // MCP endpoint
  app.all("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      // Existing session
      const transport = sessions.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    if (sessionId && !sessions.has(sessionId)) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // New session — create transport and MCP server
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, transport);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        sessions.delete(transport.sessionId);
      }
    };

    const mcpServer = createServer(client, rateLimiters);
    await mcpServer.connect(transport);

    await transport.handleRequest(req, res);
  });

  const server = app.listen(MCP_HTTP_PORT, () => {
    console.error(`OLX MCP HTTP server listening on port ${MCP_HTTP_PORT}`);
    console.error(`Server URL: ${MCP_SERVER_URL}`);
    console.error(`MCP endpoint: ${MCP_SERVER_URL}/mcp`);
    console.error(`OAuth callback: ${MCP_SERVER_URL}/oauth/callback`);
  });

  const shutdown = () => {
    console.error("Shutting down...");
    for (const [id, transport] of sessions) {
      transport.close();
      sessions.delete(id);
    }
    server.close();
    closeDb();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  closeDb();
  process.exit(1);
});
