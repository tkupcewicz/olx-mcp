import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OlxClient } from "../api/client.js";
import { getOffer } from "../services/offers.js";
import { DEFAULT_COUNTRY } from "../config.js";

const schema = {
  offer_id: z.number().describe("The OLX offer ID"),
  country: z.string().optional().describe(`Country code (default: ${DEFAULT_COUNTRY})`),
};

export function registerGetOffer(server: McpServer, client: OlxClient): void {
  server.tool(
    "get_offer",
    "Get full details of an OLX offer including description, parameters, images, and seller info.",
    schema,
    async (params) => {
      const offer = await getOffer(client, params.offer_id, params.country);

      const lines = [
        `# ${offer.title}`,
        "",
        `**Price:** ${offer.price !== null ? `${offer.price} ${offer.currency}${offer.negotiable ? " (negotiable)" : ""}` : "Not specified"}`,
        `**Location:** ${offer.location.cityName}, ${offer.location.regionName}`,
        `**URL:** ${offer.url}`,
        `**Posted:** ${offer.createdAt}`,
        `**Seller:** ${offer.user.name} (member since ${offer.user.createdAt})`,
        "",
      ];

      if (offer.params.length > 0) {
        lines.push("## Parameters");
        for (const p of offer.params) {
          lines.push(`- **${p.name}:** ${p.value}`);
        }
        lines.push("");
      }

      if (offer.description) {
        lines.push("## Description", offer.description, "");
      }

      if (offer.images.length > 0) {
        lines.push(`## Images (${offer.images.length})`, ...offer.images, "");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
