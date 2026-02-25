import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OlxClient } from "../api/client.js";
import { compareOffers } from "../services/comparison.js";
import { DEFAULT_COUNTRY } from "../config.js";

const schema = {
  offer_ids: z.array(z.number()).min(2).max(10).describe("Array of 2-10 offer IDs to compare"),
  country: z.string().optional().describe(`Country code (default: ${DEFAULT_COUNTRY})`),
};

export function registerCompareOffers(server: McpServer, client: OlxClient): void {
  server.tool(
    "compare_offers",
    "Compare 2-10 OLX offers side by side. Shows price comparison, common features, and differences.",
    schema,
    async (params) => {
      const comparison = await compareOffers(client, params.offer_ids, params.country);

      const lines = [
        `# Comparing ${comparison.offers.length} Offers`,
        "",
        "## Offers",
      ];

      for (const offer of comparison.offers) {
        const priceStr = offer.price !== null
          ? `${offer.price} ${offer.currency}`
          : "Not specified";
        lines.push(
          `- **${offer.title}** (ID: ${offer.id})`,
          `  Price: ${priceStr} | ${offer.location.cityName}`,
          `  URL: ${offer.url}`,
        );
      }

      lines.push(
        "",
        "## Price Summary",
        `- Min: ${comparison.priceRange.min ?? "N/A"}`,
        `- Max: ${comparison.priceRange.max ?? "N/A"}`,
        `- Average: ${comparison.priceRange.avg ?? "N/A"}`,
      );

      if (comparison.commonParams.length > 0) {
        lines.push("", "## Common Parameters (same across all offers)");
        for (const key of comparison.commonParams) {
          const param = comparison.offers[0]!.params.find((p) => p.key === key);
          if (param) {
            lines.push(`- **${param.name}:** ${param.value}`);
          }
        }
      }

      const diffKeys = Object.keys(comparison.paramDiffs);
      if (diffKeys.length > 0) {
        lines.push("", "## Differences");
        for (const key of diffKeys) {
          const diff = comparison.paramDiffs[key]!;
          const paramName =
            comparison.offers
              .flatMap((o) => o.params)
              .find((p) => p.key === key)?.name ?? key;

          lines.push(`### ${paramName}`);
          for (const offer of comparison.offers) {
            const value = diff[offer.id] ?? "—";
            lines.push(`- ${offer.title}: ${value}`);
          }
        }
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
