import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OlxClient } from "../api/client.js";
import {
  checkAllWatches,
  checkWatch,
  getWatch,
  formatCheckResults,
  formatTelegramResults,
} from "../services/watching.js";
import { sendMessage, getTelegramConfig } from "../watcher/telegram.js";

const schema = {
  id: z.string().optional().describe("Check a specific watch by ID. Omit to check all."),
  notify: z.boolean().optional().describe("Send Telegram notification (default: true if configured)"),
};

export function registerCheckWatches(server: McpServer, client: OlxClient): void {
  server.tool(
    "check_watches",
    "Check all (or one) price watches for new offers and price drops. Sends Telegram notification if configured.",
    schema,
    async (params) => {
      let results;

      if (params.id) {
        const watch = getWatch(params.id);
        if (!watch) {
          return { content: [{ type: "text", text: `Watch \`${params.id}\` not found.` }] };
        }
        results = [await checkWatch(client, watch)];
      } else {
        results = await checkAllWatches(client);
      }

      // Send Telegram notification if configured and not explicitly disabled
      const shouldNotify = params.notify !== false;
      let telegramSent = false;

      if (shouldNotify) {
        try {
          const config = getTelegramConfig();
          const telegramMsg = formatTelegramResults(results);
          if (telegramMsg) {
            await sendMessage(config, telegramMsg);
            telegramSent = true;
          }
        } catch {
          // Telegram not configured or failed — that's fine
        }
      }

      const text = formatCheckResults(results);
      const suffix = telegramSent ? "\n\n*Telegram notification sent.*" : "";

      return { content: [{ type: "text", text: text + suffix }] };
    },
  );
}
