import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RateLimiterPool } from "../api/rate-limiter.js";
import { AuthenticatedOlxClient, PartnerApiError } from "../api/authenticated-client.js";
import { getAccessToken } from "../auth/helpers.js";
import { listMyAdverts } from "../services/adverts.js";

function formatError(err: unknown): string {
  if (err instanceof PartnerApiError) return `API error (${err.status}): ${err.message}`;
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
import { DEFAULT_COUNTRY } from "../config.js";

const schema = {
  status: z
    .enum(["active", "limited", "disabled", "removed", "outdated"])
    .optional()
    .describe("Filter by advert status"),
  page: z.number().min(1).optional().describe("Page number (default: 1)"),
  limit: z.number().min(1).max(50).optional().describe("Results per page (default: 20, max: 50)"),
  country: z.string().optional().describe(`Country code (default: ${DEFAULT_COUNTRY})`),
};

export function registerListMyAdverts(
  server: McpServer,
  rateLimiters: RateLimiterPool,
): void {
  server.tool(
    "list_my_adverts",
    "List your own OLX adverts. Requires authentication.",
    schema,
    async (params, extra) => {
      const token = getAccessToken(extra);
      const client = new AuthenticatedOlxClient(token, rateLimiters);

      const page = params.page ?? 1;
      const limit = params.limit ?? 20;

      const result = await listMyAdverts(client, {
        offset: (page - 1) * limit,
        limit,
        status: params.status,
        country: params.country,
      });

      const lines = [
        `Your adverts (page ${page}, showing ${result.adverts.length}):`,
        "",
      ];

      for (const advert of result.adverts) {
        const priceStr = advert.price !== null
          ? `${advert.price} ${advert.currency}`
          : "No price";
        lines.push(
          `**${advert.title}**`,
          `  ID: ${advert.id} | Status: ${advert.status} | Price: ${priceStr}`,
          `  URL: ${advert.url}`,
          `  Valid to: ${advert.validTo}`,
          "",
        );
      }

      if (result.hasNextPage) {
        lines.push(`Next page: ${page + 1}`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
