import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OlxClient } from "../api/client.js";
import { searchOffers } from "../services/offers.js";
import { DEFAULT_COUNTRY } from "../config.js";

const schema = {
  query: z.string().optional().describe("Search query text"),
  category_id: z.number().optional().describe("Category ID to filter by"),
  region_id: z.number().optional().describe("Region ID to filter by"),
  city_id: z.number().optional().describe("City ID to filter by"),
  price_min: z.number().optional().describe("Minimum price"),
  price_max: z.number().optional().describe("Maximum price"),
  sort_by: z
    .enum([
      "created_at:desc",
      "created_at:asc",
      "filter_float_price:asc",
      "filter_float_price:desc",
      "relevance:desc",
    ])
    .optional()
    .describe("Sort order (default: created_at:desc)"),
  page: z.number().min(1).optional().describe("Page number (default: 1)"),
  limit: z.number().min(1).max(50).optional().describe("Results per page (default: 40, max: 50)"),
  country: z.string().optional().describe(`Country code (default: ${DEFAULT_COUNTRY}). Options: pl, bg, ro, pt, ua, kz`),
};

export function registerSearchOffers(server: McpServer, client: OlxClient): void {
  server.tool(
    "search_offers",
    "Search OLX marketplace listings. Returns offer summaries with price, location, and links.",
    schema,
    async (params) => {
      const result = await searchOffers(client, {
        query: params.query,
        categoryId: params.category_id,
        regionId: params.region_id,
        cityId: params.city_id,
        priceMin: params.price_min,
        priceMax: params.price_max,
        sortBy: params.sort_by,
        page: params.page,
        limit: params.limit,
        country: params.country,
      });

      const lines = [
        `Found ${result.totalCount} offers (page ${result.page}, showing ${result.offers.length})`,
        "",
      ];

      for (const offer of result.offers) {
        const priceStr = offer.price !== null
          ? `${offer.price} ${offer.currency}${offer.negotiable ? " (negotiable)" : ""}`
          : "Price not specified";
        lines.push(
          `**${offer.title}**`,
          `  ID: ${offer.id} | Price: ${priceStr}`,
          `  Location: ${offer.cityName}, ${offer.regionName}`,
          `  URL: ${offer.url}`,
          `  Posted: ${offer.createdAt}${offer.isBusiness ? " | Business seller" : ""}${offer.isPromoted ? " | Promoted" : ""}`,
          "",
        );
      }

      if (result.hasNextPage) {
        lines.push(`Next page: ${result.page + 1}`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
