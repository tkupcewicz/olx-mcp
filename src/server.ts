import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OlxClient } from "./api/client.js";
import { registerSearchOffers } from "./tools/search-offers.js";
import { registerGetOffer } from "./tools/get-offer.js";
import { registerGetCategories } from "./tools/get-categories.js";
import { registerTrackSearch } from "./tools/track-search.js";
import { registerGetPriceHistory } from "./tools/get-price-history.js";
import { registerCompareOffers } from "./tools/compare-offers.js";
import { registerTrackedSearchesResource } from "./resources/tracked-searches.js";

export function createServer(client: OlxClient): McpServer {
  const server = new McpServer({
    name: "olx-mcp",
    version: "1.0.0",
  });

  registerAllTools(server, client);
  registerAllResources(server);

  return server;
}

function registerAllTools(server: McpServer, client: OlxClient): void {
  registerSearchOffers(server, client);
  registerGetOffer(server, client);
  registerGetCategories(server, client);
  registerTrackSearch(server, client);
  registerGetPriceHistory(server, client);
  registerCompareOffers(server, client);
}

function registerAllResources(server: McpServer): void {
  registerTrackedSearchesResource(server);
}
