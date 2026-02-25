import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RateLimiterPool } from "../api/rate-limiter.js";
import { AuthenticatedOlxClient } from "../api/authenticated-client.js";
import { getAccessToken } from "../auth/helpers.js";
import { updateAdvert } from "../services/adverts.js";
import { DEFAULT_COUNTRY } from "../config.js";

const schema = {
  advert_id: z.number().describe("ID of the advert to update"),
  title: z.string().min(2).max(70).optional().describe("New title"),
  description: z.string().min(20).max(9000).optional().describe("New description"),
  price: z.number().optional().describe("New price"),
  currency: z.string().optional().describe("Currency code"),
  city_id: z.number().optional().describe("New city ID"),
  district_id: z.number().optional().describe("New district ID"),
  lat: z.number().optional().describe("New latitude"),
  lon: z.number().optional().describe("New longitude"),
  images: z.array(z.string()).optional().describe("New image URLs (replaces existing)"),
  attributes: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe("Updated attributes"),
  contact_name: z.string().optional().describe("Contact person name"),
  contact_phone: z.string().optional().describe("Contact phone number"),
  country: z.string().optional().describe(`Country code (default: ${DEFAULT_COUNTRY})`),
};

export function registerUpdateAdvert(
  server: McpServer,
  rateLimiters: RateLimiterPool,
): void {
  server.tool(
    "update_advert",
    "Update an existing OLX listing. Requires authentication. Only provide fields you want to change.",
    schema,
    async (params, extra) => {
      const token = getAccessToken(extra);
      const client = new AuthenticatedOlxClient(token, rateLimiters);

      const advert = await updateAdvert(
        client,
        params.advert_id,
        {
          title: params.title,
          description: params.description,
          price: params.price,
          currency: params.currency,
          cityId: params.city_id,
          districtId: params.district_id,
          lat: params.lat,
          lon: params.lon,
          images: params.images,
          attributes: params.attributes,
          contact: params.contact_name || params.contact_phone
            ? { name: params.contact_name, phone: params.contact_phone }
            : undefined,
        },
        params.country,
      );

      const lines = [
        `Advert updated successfully!`,
        "",
        `**${advert.title}**`,
        `ID: ${advert.id}`,
        `Status: ${advert.status}`,
        `URL: ${advert.url}`,
      ];

      if (advert.price !== null) {
        lines.push(`Price: ${advert.price} ${advert.currency}`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
