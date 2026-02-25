import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RateLimiterPool } from "../api/rate-limiter.js";
import { AuthenticatedOlxClient } from "../api/authenticated-client.js";
import { getAccessToken } from "../auth/helpers.js";
import { deleteAdvert } from "../services/adverts.js";
import { DEFAULT_COUNTRY } from "../config.js";

const schema = {
  advert_id: z.number().describe("ID of the advert to delete"),
  country: z.string().optional().describe(`Country code (default: ${DEFAULT_COUNTRY})`),
};

export function registerDeleteAdvert(
  server: McpServer,
  rateLimiters: RateLimiterPool,
): void {
  server.tool(
    "delete_advert",
    "Delete one of your OLX listings. Requires authentication. This action cannot be undone.",
    schema,
    async (params, extra) => {
      const token = getAccessToken(extra);
      const client = new AuthenticatedOlxClient(token, rateLimiters);

      await deleteAdvert(client, params.advert_id, params.country);

      return {
        content: [{
          type: "text",
          text: `Advert ${params.advert_id} has been deleted successfully.`,
        }],
      };
    },
  );
}
