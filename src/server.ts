import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OlxClient } from "./api/client.js";
import type { RateLimiterPool } from "./api/rate-limiter.js";
import { registerSearchOffers } from "./tools/search-offers.js";
import { registerGetOffer } from "./tools/get-offer.js";
import { registerGetCategories } from "./tools/get-categories.js";
import { registerTrackSearch } from "./tools/track-search.js";
import { registerGetPriceHistory } from "./tools/get-price-history.js";
import { registerCompareOffers } from "./tools/compare-offers.js";
import { registerAddWatch } from "./tools/add-watch.js";
import { registerRemoveWatch } from "./tools/remove-watch.js";
import { registerCheckWatches } from "./tools/check-watches.js";
import { registerListMyAdverts } from "./tools/list-my-adverts.js";
import { registerCreateAdvert } from "./tools/create-advert.js";
import { registerUpdateAdvert } from "./tools/update-advert.js";
import { registerDeleteAdvert } from "./tools/delete-advert.js";
import { registerGetAdvertAttributes } from "./tools/get-advert-attributes.js";
import { registerTrackedSearchesResource } from "./resources/tracked-searches.js";

export function createServer(
  client: OlxClient,
  rateLimiters: RateLimiterPool,
): McpServer {
  const server = new McpServer({
    name: "olx-mcp",
    version: "1.0.0",
  });

  registerAllTools(server, client, rateLimiters);
  registerAllResources(server);

  return server;
}

function registerAllTools(
  server: McpServer,
  client: OlxClient,
  rateLimiters: RateLimiterPool,
): void {
  // Read-only tools (no auth required)
  registerSearchOffers(server, client);
  registerGetOffer(server, client);
  registerGetCategories(server, client);
  registerTrackSearch(server, client);
  registerGetPriceHistory(server, client);
  registerCompareOffers(server, client);
  registerAddWatch(server);
  registerRemoveWatch(server);
  registerCheckWatches(server, client);

  // Offer management tools (auth required)
  registerListMyAdverts(server, rateLimiters);
  registerCreateAdvert(server, rateLimiters);
  registerUpdateAdvert(server, rateLimiters);
  registerDeleteAdvert(server, rateLimiters);
  registerGetAdvertAttributes(server, rateLimiters);
}

function registerAllResources(server: McpServer): void {
  registerTrackedSearchesResource(server);
}
