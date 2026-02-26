#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OlxClient } from "./api/client.js";
import { RateLimiterPool } from "./api/rate-limiter.js";
import { RATE_LIMIT_CAPACITY, RATE_LIMIT_WINDOW_MS } from "./config.js";
import { getDb, closeDb } from "./db/database.js";
import { createServer } from "./server.js";
import { loadEnv } from "./watcher/env.js";

async function main(): Promise<void> {
  // Load .env for Telegram config etc.
  loadEnv();

  // Initialize database
  getDb();

  // Create API client with rate limiter pool
  const rateLimiters = new RateLimiterPool(RATE_LIMIT_CAPACITY, RATE_LIMIT_WINDOW_MS);
  const client = new OlxClient(rateLimiters);

  // Create and start MCP server
  const server = createServer(client, rateLimiters);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Cleanup on shutdown
  process.on("SIGINT", () => {
    closeDb();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    closeDb();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  closeDb();
  process.exit(1);
});
