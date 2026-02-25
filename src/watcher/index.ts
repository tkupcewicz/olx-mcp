import { loadEnv } from "./env.js";
import { getTelegramConfig, sendMessage } from "./telegram.js";
import { OlxClient } from "../api/client.js";
import { RateLimiterPool } from "../api/rate-limiter.js";
import { RATE_LIMIT_CAPACITY, RATE_LIMIT_WINDOW_MS } from "../config.js";
import { getDb, closeDb } from "../db/database.js";
import { checkAllWatches, formatTelegramResults } from "../services/watching.js";

/**
 * Standalone watcher script for cron jobs.
 * Reads watches from DB (added via MCP add_watch tool),
 * checks for changes, and sends Telegram notifications.
 *
 * Usage: npm run watch
 * Cron:  0 8,14,20 * * * cd /path/to/olx-mcp && npm run watch
 */

async function main(): Promise<void> {
  loadEnv();

  const telegram = getTelegramConfig();

  // Ensure DB is initialized
  getDb();

  const rateLimiters = new RateLimiterPool(RATE_LIMIT_CAPACITY, RATE_LIMIT_WINDOW_MS);
  const client = new OlxClient(rateLimiters);

  console.log("Checking watches...");
  const results = await checkAllWatches(client);

  if (results.length === 0) {
    console.log("No watches configured. Add watches via Claude using the add_watch tool.");
    closeDb();
    return;
  }

  for (const r of results) {
    if (r.isFirstRun) {
      console.log(`  ${r.watch.name}: first run, stored ${r.totalCurrent} offers`);
    } else {
      console.log(`  ${r.watch.name}: ${r.newOffers.length} new, ${r.priceDrops.length} drops, ${r.removedCount} removed`);
    }
  }

  const telegramMsg = formatTelegramResults(results);
  if (telegramMsg) {
    await sendMessage(telegram, telegramMsg);
    console.log("\nTelegram notification sent.");
  } else {
    console.log("\nNo changes to report.");
  }

  closeDb();
}

main().catch((err) => {
  console.error("Watcher failed:", err);
  process.exit(1);
});
