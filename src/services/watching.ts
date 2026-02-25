import crypto from "node:crypto";
import type { OlxClient } from "../api/client.js";
import { searchOffers, type SearchParams } from "./offers.js";
import { getDb } from "../db/database.js";
import type { OfferSummary } from "../types/domain.js";

// --- Types ---

export interface Watch {
  id: string;
  name: string;
  query: string;
  country: string;
  categoryId: number | null;
  priceMin: number | null;
  priceMax: number | null;
  alertBelow: number | null;
  createdAt: string;
}

export interface WatchCheckResult {
  watch: Watch;
  totalCurrent: number;
  isFirstRun: boolean;
  newOffers: OfferSummary[];
  priceDrops: PriceDropInfo[];
  removedCount: number;
  cheapest: number | null;
}

export interface PriceDropInfo {
  offer: OfferSummary;
  oldPrice: number;
  newPrice: number;
}

interface StoredOffer {
  offer_id: number;
  title: string;
  price: number | null;
  currency: string;
  url: string;
  location: string;
}

// --- Watch CRUD ---

export function addWatch(params: {
  name: string;
  query: string;
  country?: string;
  categoryId?: number;
  priceMin?: number;
  priceMax?: number;
  alertBelow?: number;
}): Watch {
  const db = getDb();
  const id = crypto.randomUUID().slice(0, 8);

  db.prepare(`
    INSERT INTO watches (id, name, query, country, category_id, price_min, price_max, alert_below)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.name,
    params.query,
    params.country ?? "pl",
    params.categoryId ?? null,
    params.priceMin ?? null,
    params.priceMax ?? null,
    params.alertBelow ?? null,
  );

  return getWatch(id)!;
}

export function getWatch(id: string): Watch | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT id, name, query, country, category_id as categoryId,
           price_min as priceMin, price_max as priceMax,
           alert_below as alertBelow, created_at as createdAt
    FROM watches WHERE id = ?
  `).get(id) as Watch | undefined;
}

export function listWatches(): Watch[] {
  const db = getDb();
  return db.prepare(`
    SELECT id, name, query, country, category_id as categoryId,
           price_min as priceMin, price_max as priceMax,
           alert_below as alertBelow, created_at as createdAt
    FROM watches ORDER BY created_at DESC
  `).all() as Watch[];
}

export function removeWatch(id: string): boolean {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM watch_offers WHERE config_id = ?").run(id);
    const result = db.prepare("DELETE FROM watches WHERE id = ?").run(id);
    return result.changes > 0;
  });
  return tx();
}

// --- Check watches ---

export async function checkWatch(
  client: OlxClient,
  watch: Watch,
): Promise<WatchCheckResult> {
  const db = getDb();

  // Fetch current offers
  const params: SearchParams = {
    query: watch.query,
    categoryId: watch.categoryId ?? undefined,
    priceMin: watch.priceMin ?? undefined,
    priceMax: watch.priceMax ?? undefined,
    sortBy: "filter_float_price:asc",
    country: watch.country,
  };

  const offers = await fetchAllPages(client, params);
  const stored = getStoredOffers(db, watch.id);
  const isFirstRun = stored.size === 0;

  // Diff
  const newOffers: OfferSummary[] = [];
  const priceDrops: PriceDropInfo[] = [];

  for (const offer of offers) {
    const prev = stored.get(offer.id);

    if (!prev) {
      if (!watch.alertBelow || (offer.price !== null && offer.price <= watch.alertBelow)) {
        newOffers.push(offer);
      }
      continue;
    }

    if (prev.price !== null && offer.price !== null && offer.price < prev.price) {
      priceDrops.push({ offer, oldPrice: prev.price, newPrice: offer.price });
    }
  }

  // Count removed offers
  const currentIds = new Set(offers.map((o) => o.id));
  let removedCount = 0;
  for (const id of stored.keys()) {
    if (!currentIds.has(id)) removedCount++;
  }

  // Update DB
  upsertOffers(db, watch.id, offers);

  // Cheapest price
  const prices = offers.map((o) => o.price).filter((p): p is number => p !== null);
  const cheapest = prices.length > 0 ? Math.min(...prices) : null;

  return {
    watch,
    totalCurrent: offers.length,
    isFirstRun,
    newOffers,
    priceDrops,
    removedCount,
    cheapest,
  };
}

export async function checkAllWatches(
  client: OlxClient,
): Promise<WatchCheckResult[]> {
  const watches = listWatches();
  const results: WatchCheckResult[] = [];

  for (const watch of watches) {
    results.push(await checkWatch(client, watch));
  }

  return results;
}

// --- Formatting for MCP response ---

export function formatCheckResults(results: WatchCheckResult[]): string {
  if (results.length === 0) return "No watches configured. Use `add_watch` to start tracking.";

  const sections: string[] = [];

  for (const r of results) {
    const lines: string[] = [];
    lines.push(`## ${r.watch.name}`);

    if (r.isFirstRun) {
      lines.push(`Started tracking — ${r.totalCurrent} offers found, cheapest: ${r.cheapest?.toLocaleString("pl-PL") ?? "N/A"} PLN`);
    } else {
      lines.push(`${r.totalCurrent} current offers, cheapest: ${r.cheapest?.toLocaleString("pl-PL") ?? "N/A"} PLN`);

      if (r.newOffers.length > 0) {
        lines.push("");
        lines.push(`### ${r.newOffers.length} new offer${r.newOffers.length > 1 ? "s" : ""}`);
        for (const o of r.newOffers.slice(0, 15)) {
          const loc = [o.cityName, o.regionName].filter(Boolean).join(", ");
          lines.push(`- **${o.price?.toLocaleString("pl-PL") ?? "?"} ${o.currency}** — ${o.title}${loc ? ` (${loc})` : ""}`);
          lines.push(`  ${o.url}`);
        }
        if (r.newOffers.length > 15) lines.push(`- ... and ${r.newOffers.length - 15} more`);
      }

      if (r.priceDrops.length > 0) {
        lines.push("");
        lines.push(`### ${r.priceDrops.length} price drop${r.priceDrops.length > 1 ? "s" : ""}`);
        for (const d of r.priceDrops.slice(0, 15)) {
          const pct = Math.round(((d.oldPrice - d.newPrice) / d.oldPrice) * 100);
          lines.push(`- **${d.newPrice.toLocaleString("pl-PL")} PLN** ~~${d.oldPrice.toLocaleString("pl-PL")}~~ (-${pct}%) — ${d.offer.title}`);
          lines.push(`  ${d.offer.url}`);
        }
      }

      if (r.removedCount > 0) {
        lines.push("");
        lines.push(`${r.removedCount} offer${r.removedCount > 1 ? "s" : ""} removed/sold since last check.`);
      }

      if (r.newOffers.length === 0 && r.priceDrops.length === 0) {
        lines.push("No changes since last check.");
      }
    }

    sections.push(lines.join("\n"));
  }

  return sections.join("\n\n---\n\n");
}

// --- Telegram formatting ---

export function formatTelegramResults(results: WatchCheckResult[]): string | null {
  const parts: string[] = [];

  for (const r of results) {
    if (r.isFirstRun) {
      let msg = `<b>${esc(r.watch.name)} — tracking started</b>\n`;
      msg += `${r.totalCurrent} offers, cheapest: ${fmtPrice(r.cheapest, "PLN")}`;
      parts.push(msg);
      continue;
    }

    if (r.newOffers.length > 0) {
      let msg = `<b>${esc(r.watch.name)} — ${r.newOffers.length} new</b>\n\n`;
      for (const o of r.newOffers.slice(0, 20)) {
        const loc = [o.cityName, o.regionName].filter(Boolean).join(", ");
        msg += `<b>${fmtPrice(o.price, o.currency)}</b>`;
        if (loc) msg += ` · ${esc(loc)}`;
        msg += `\n<a href="${o.url}">${esc(o.title)}</a>\n\n`;
      }
      parts.push(msg);
    }

    if (r.priceDrops.length > 0) {
      let msg = `<b>${esc(r.watch.name)} — ${r.priceDrops.length} price drop${r.priceDrops.length > 1 ? "s" : ""}</b>\n\n`;
      for (const d of r.priceDrops.slice(0, 20)) {
        const pct = Math.round(((d.oldPrice - d.newPrice) / d.oldPrice) * 100);
        msg += `<b>${fmtPrice(d.newPrice, d.offer.currency)}</b>`;
        msg += ` <s>${fmtPrice(d.oldPrice, d.offer.currency)}</s> (−${pct}%)`;
        msg += `\n<a href="${d.offer.url}">${esc(d.offer.title)}</a>\n\n`;
      }
      parts.push(msg);
    }
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtPrice(price: number | null, currency: string): string {
  if (price === null) return "no price";
  return `${price.toLocaleString("pl-PL")} ${currency}`;
}

// --- Helpers ---

function getStoredOffers(db: import("better-sqlite3").Database, configId: string): Map<number, StoredOffer> {
  const rows = db
    .prepare("SELECT offer_id, title, price, currency, url, location FROM watch_offers WHERE config_id = ?")
    .all(configId) as StoredOffer[];

  const map = new Map<number, StoredOffer>();
  for (const row of rows) map.set(row.offer_id, row);
  return map;
}

function upsertOffers(db: import("better-sqlite3").Database, configId: string, offers: OfferSummary[]): void {
  const upsert = db.prepare(`
    INSERT INTO watch_offers (config_id, offer_id, title, price, currency, url, location, first_seen_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(config_id, offer_id) DO UPDATE SET
      title = excluded.title,
      price = excluded.price,
      url = excluded.url,
      location = excluded.location,
      last_seen_at = datetime('now')
  `);

  const tx = db.transaction(() => {
    for (const o of offers) {
      const location = [o.cityName, o.regionName].filter(Boolean).join(", ");
      upsert.run(configId, o.id, o.title, o.price, o.currency, o.url, location);
    }
  });
  tx();
}

async function fetchAllPages(client: OlxClient, params: SearchParams): Promise<OfferSummary[]> {
  const allOffers: OfferSummary[] = [];
  let page = 1;

  while (page <= 5) {
    const result = await searchOffers(client, { ...params, page, limit: 40 });
    allOffers.push(...result.offers);
    if (!result.hasNextPage) break;
    page++;
  }

  return allOffers;
}
