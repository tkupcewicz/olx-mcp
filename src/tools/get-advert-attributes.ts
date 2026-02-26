import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RateLimiterPool } from "../api/rate-limiter.js";
import { AuthenticatedOlxClient, PartnerApiError } from "../api/authenticated-client.js";
import { getAccessToken } from "../auth/helpers.js";
import { getAdvertAttributes } from "../services/advert-attributes.js";

function formatError(err: unknown): string {
  if (err instanceof PartnerApiError) return `API error (${err.status}): ${err.message}`;
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
import { DEFAULT_COUNTRY } from "../config.js";

const schema = {
  category_id: z.number().describe("Category ID to get attributes for"),
  country: z.string().optional().describe(`Country code (default: ${DEFAULT_COUNTRY})`),
};

export function registerGetAdvertAttributes(
  server: McpServer,
  rateLimiters: RateLimiterPool,
): void {
  server.tool(
    "get_advert_attributes",
    "Get the required and optional fields for creating an advert in a specific category. Requires authentication. Use this before create_advert to know which attributes are needed.",
    schema,
    async (params, extra) => {
      try {
        const token = getAccessToken(extra);
        const client = new AuthenticatedOlxClient(token, rateLimiters);

        const attributes = await getAdvertAttributes(
          client,
          params.category_id,
          params.country,
        );

        const lines = [
          `Attributes for category ${params.category_id}:`,
          "",
        ];

        const required = attributes.filter((a) => a.required);
        const optional = attributes.filter((a) => !a.required);

        if (required.length > 0) {
          lines.push("## Required attributes");
          for (const attr of required) {
            lines.push(`- **${attr.code}** (${attr.label}) — type: ${attr.type}`);
            if (attr.values && attr.values.length > 0) {
              const valueList = attr.values.slice(0, 20).map((v) => `\`${v.code}\`: ${v.label}`);
              lines.push(`  Values: ${valueList.join(", ")}${attr.values.length > 20 ? ` ... (+${attr.values.length - 20} more)` : ""}`);
            }
            if (attr.min !== undefined || attr.max !== undefined) {
              lines.push(`  Range: ${attr.min ?? "—"} to ${attr.max ?? "—"}${attr.unit ? ` ${attr.unit}` : ""}`);
            }
          }
          lines.push("");
        }

        if (optional.length > 0) {
          lines.push("## Optional attributes");
          for (const attr of optional) {
            lines.push(`- **${attr.code}** (${attr.label}) — type: ${attr.type}`);
            if (attr.values && attr.values.length > 0) {
              const valueList = attr.values.slice(0, 10).map((v) => `\`${v.code}\`: ${v.label}`);
              lines.push(`  Values: ${valueList.join(", ")}${attr.values.length > 10 ? ` ... (+${attr.values.length - 10} more)` : ""}`);
            }
          }
          lines.push("");
        }

        if (attributes.length === 0) {
          lines.push("No specific attributes required for this category.");
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );
}
