import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RateLimiterPool } from "../api/rate-limiter.js";
import { AuthenticatedOlxClient } from "../api/authenticated-client.js";
import { getAccessToken } from "../auth/helpers.js";
import { createAdvert } from "../services/adverts.js";
import { DEFAULT_COUNTRY } from "../config.js";

const schema = {
  title: z.string().min(2).max(70).describe("Advert title (2-70 characters)"),
  description: z.string().min(20).max(9000).describe("Advert description (20-9000 characters)"),
  category_id: z.number().describe("Category ID (use get_advert_attributes to find required fields)"),
  price: z.number().optional().describe("Price value"),
  currency: z.string().optional().describe("Currency code (default: PLN)"),
  city_id: z.number().describe("City ID for the advert location"),
  district_id: z.number().optional().describe("District ID within the city"),
  lat: z.number().optional().describe("Latitude for map pin"),
  lon: z.number().optional().describe("Longitude for map pin"),
  images: z.array(z.string()).optional().describe("Array of image URLs"),
  attributes: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe("Category-specific attributes (key-value pairs)"),
  contact_name: z.string().optional().describe("Contact person name"),
  contact_phone: z.string().optional().describe("Contact phone number"),
  country: z.string().optional().describe(`Country code (default: ${DEFAULT_COUNTRY})`),
};

export function registerCreateAdvert(
  server: McpServer,
  rateLimiters: RateLimiterPool,
): void {
  server.tool(
    "create_advert",
    "Create a new OLX listing. Requires authentication. Use get_advert_attributes first to learn required fields for the category.",
    schema,
    async (params, extra) => {
      const token = getAccessToken(extra);
      const client = new AuthenticatedOlxClient(token, rateLimiters);

      const advert = await createAdvert(
        client,
        {
          title: params.title,
          description: params.description,
          categoryId: params.category_id,
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
        `Advert created successfully!`,
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
