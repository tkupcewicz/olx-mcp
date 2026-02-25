import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OlxClient } from "../api/client.js";
import { createTrackedSearch } from "../services/tracking.js";
import { DEFAULT_COUNTRY } from "../config.js";

const schema = {
  name: z.string().describe("A human-readable name for this tracked search (e.g. 'Gaming laptops under 3000 PLN')"),
  query: z.string().optional().describe("Search query text"),
  category_id: z.number().optional().describe("Category ID to filter by"),
  region_id: z.number().optional().describe("Region ID"),
  city_id: z.number().optional().describe("City ID"),
  price_min: z.number().optional().describe("Minimum price"),
  price_max: z.number().optional().describe("Maximum price"),
  country: z.string().optional().describe(`Country code (default: ${DEFAULT_COUNTRY})`),
};

export function registerTrackSearch(server: McpServer, client: OlxClient): void {
  server.tool(
    "track_search",
    "Save a search to track price trends over time. Takes an initial snapshot immediately. Use get_price_history to see trends.",
    schema,
    async (params) => {
      const { trackedSearch, initialSnapshot } = await createTrackedSearch(client, {
        name: params.name,
        query: params.query,
        categoryId: params.category_id,
        regionId: params.region_id,
        cityId: params.city_id,
        priceMin: params.price_min,
        priceMax: params.price_max,
        country: params.country,
      });

      const lines = [
        `Search tracking created: **${trackedSearch.name}**`,
        `Tracking ID: \`${trackedSearch.id}\``,
        "",
        "## Initial Snapshot",
        `- Date: ${initialSnapshot.snapshotDate}`,
        `- Total offers: ${initialSnapshot.totalOffers}`,
        `- Avg price: ${initialSnapshot.avgPrice ?? "N/A"}`,
        `- Median price: ${initialSnapshot.medianPrice ?? "N/A"}`,
        `- Price range: ${initialSnapshot.minPrice ?? "N/A"} — ${initialSnapshot.maxPrice ?? "N/A"}`,
        "",
        "Use `get_price_history` with this tracking ID to view trends over time.",
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
