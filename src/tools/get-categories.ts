import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OlxClient } from "../api/client.js";
import { getCategories } from "../services/categories.js";
import { DEFAULT_COUNTRY } from "../config.js";
import type { Category } from "../types/domain.js";

const schema = {
  parent_id: z.number().optional().describe("Parent category ID to get children of. Omit for top-level categories."),
  country: z.string().optional().describe(`Country code (default: ${DEFAULT_COUNTRY})`),
};

function formatCategories(categories: Category[], indent = 0): string[] {
  const lines: string[] = [];
  for (const cat of categories) {
    const prefix = "  ".repeat(indent);
    lines.push(`${prefix}- **${cat.name}** (ID: ${cat.id})`);
    if (cat.children.length > 0) {
      lines.push(...formatCategories(cat.children, indent + 1));
    }
  }
  return lines;
}

export function registerGetCategories(server: McpServer, client: OlxClient): void {
  server.tool(
    "get_categories",
    "Get OLX marketplace categories. Returns category tree with IDs for filtering searches.",
    schema,
    async (params) => {
      const categories = await getCategories(client, params.country, params.parent_id);

      const lines = [
        params.parent_id
          ? `Subcategories of category ${params.parent_id}:`
          : "Top-level categories:",
        "",
        ...formatCategories(categories),
      ];

      if (categories.length === 0) {
        lines.push("", "No categories found. Try searching without a category filter, or use a known category ID.");
      }

      lines.push("", "_Note: The OLX categories API is deprecated. This is a curated list. Category IDs can be used in search_offers._");

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
