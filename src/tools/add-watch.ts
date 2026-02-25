import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { addWatch, listWatches } from "../services/watching.js";
import { DEFAULT_COUNTRY } from "../config.js";

const schema = {
  name: z.string().describe("Human-readable name (e.g. 'RTX 5080')"),
  query: z.string().describe("Search query"),
  category_id: z.number().optional().describe("Category ID (e.g. 2184 for GPUs)"),
  price_min: z.number().optional().describe("Minimum price filter"),
  price_max: z.number().optional().describe("Maximum price filter"),
  alert_below: z.number().optional().describe("Only alert on new offers below this price"),
  country: z.string().optional().describe(`Country code (default: ${DEFAULT_COUNTRY})`),
};

export function registerAddWatch(server: McpServer): void {
  server.tool(
    "add_watch",
    "Add a price watch for OLX offers. Watches track new offers and price drops. Use check_watches to see changes.",
    schema,
    async (params) => {
      const watch = addWatch({
        name: params.name,
        query: params.query,
        categoryId: params.category_id,
        priceMin: params.price_min,
        priceMax: params.price_max,
        alertBelow: params.alert_below,
        country: params.country,
      });

      const total = listWatches().length;

      const lines = [
        `Watch added: **${watch.name}**`,
        `ID: \`${watch.id}\``,
        `Query: "${watch.query}"`,
        watch.categoryId ? `Category: ${watch.categoryId}` : null,
        watch.priceMin || watch.priceMax
          ? `Price range: ${watch.priceMin ?? "any"} — ${watch.priceMax ?? "any"} PLN`
          : null,
        watch.alertBelow ? `Alert below: ${watch.alertBelow} PLN` : null,
        "",
        `You now have ${total} active watch${total > 1 ? "es" : ""}. Use \`check_watches\` to scan for changes.`,
      ].filter((l) => l !== null);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
