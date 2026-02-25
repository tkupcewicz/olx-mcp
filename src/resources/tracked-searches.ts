import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../db/database.js";
import { getAllTrackedSearches, getTrackedSearch, getSnapshots } from "../db/queries.js";

export function registerTrackedSearchesResource(server: McpServer): void {
  server.resource(
    "tracked-searches-list",
    "olx://tracked-searches",
    { description: "List all tracked OLX searches", mimeType: "application/json" },
    async () => {
      const db = getDb();
      const searches = getAllTrackedSearches(db);
      return {
        contents: [
          {
            uri: "olx://tracked-searches",
            text: JSON.stringify(searches, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    },
  );

  server.resource(
    "tracked-search-detail",
    new ResourceTemplate("olx://tracked-searches/{id}", { list: undefined }),
    { description: "Get details and price history for a tracked search", mimeType: "application/json" },
    async (_uri, variables) => {
      const id = String(variables.id);
      const db = getDb();
      const search = getTrackedSearch(db, id);
      if (!search) {
        throw new Error(`Tracked search not found: ${id}`);
      }
      const snapshots = getSnapshots(db, id);
      const data = { ...search, snapshots };
      return {
        contents: [
          {
            uri: `olx://tracked-searches/${id}`,
            text: JSON.stringify(data, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    },
  );
}
