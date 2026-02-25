import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OlxClient } from "../api/client.js";
import { getPriceHistory, isSnapshotStale, takeSnapshot } from "../services/tracking.js";

const schema = {
  tracking_id: z.string().describe("The tracking ID returned by track_search"),
  refresh: z.boolean().optional().describe("Force a fresh snapshot even if one exists for today (default: auto-refresh if stale)"),
};

export function registerGetPriceHistory(server: McpServer, client: OlxClient): void {
  server.tool(
    "get_price_history",
    "Get price history and trends for a tracked search. Automatically takes a fresh snapshot if today's data is missing.",
    schema,
    async (params) => {
      const shouldRefresh = params.refresh ?? isSnapshotStale(params.tracking_id);

      if (shouldRefresh) {
        try {
          await takeSnapshot(client, params.tracking_id);
        } catch {
          // Continue with existing data if snapshot fails
        }
      }

      const history = getPriceHistory(params.tracking_id);

      const lines = [
        `# Price History: ${history.trackedSearch.name}`,
        `Query: ${history.trackedSearch.query ?? "(all)"}`,
        `Country: ${history.trackedSearch.country}`,
        "",
      ];

      if (history.snapshots.length === 0) {
        lines.push("No snapshots available.");
      } else {
        lines.push("| Date | Offers | Avg | Median | Min | Max |");
        lines.push("|------|--------|-----|--------|-----|-----|");

        for (const snap of history.snapshots) {
          lines.push(
            `| ${snap.snapshotDate} | ${snap.totalOffers} | ${snap.avgPrice ?? "-"} | ${snap.medianPrice ?? "-"} | ${snap.minPrice ?? "-"} | ${snap.maxPrice ?? "-"} |`,
          );
        }

        if (history.snapshots.length >= 2) {
          const first = history.snapshots[0]!;
          const last = history.snapshots[history.snapshots.length - 1]!;
          if (first.avgPrice && last.avgPrice) {
            const change = last.avgPrice - first.avgPrice;
            const pct = ((change / first.avgPrice) * 100).toFixed(1);
            lines.push(
              "",
              `**Trend:** Average price ${change >= 0 ? "increased" : "decreased"} by ${Math.abs(change).toFixed(2)} (${change >= 0 ? "+" : ""}${pct}%) over ${history.snapshots.length} snapshots.`,
            );
          }
        }
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
