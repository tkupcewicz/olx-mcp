import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { removeWatch, getWatch } from "../services/watching.js";

const schema = {
  id: z.string().describe("Watch ID to remove"),
};

export function registerRemoveWatch(server: McpServer): void {
  server.tool(
    "remove_watch",
    "Remove a price watch and its stored offer history.",
    schema,
    async (params) => {
      const watch = getWatch(params.id);
      const removed = removeWatch(params.id);

      const text = removed
        ? `Removed watch: **${watch?.name ?? params.id}**`
        : `Watch \`${params.id}\` not found.`;

      return { content: [{ type: "text", text }] };
    },
  );
}
