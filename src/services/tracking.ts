import crypto from "node:crypto";
import type { OlxClient } from "../api/client.js";
import { getDb } from "../db/database.js";
import {
  insertTrackedSearch,
  getTrackedSearch,
  insertPriceSnapshot,
  insertSnapshotOffers,
  getSnapshots,
  getLatestSnapshot,
} from "../db/queries.js";
import type {
  TrackedSearch,
  PriceHistory,
  PriceSnapshot,
} from "../types/domain.js";
import { searchOffers, type SearchParams } from "./offers.js";

export interface CreateTrackingParams {
  name: string;
  country?: string;
  query?: string;
  categoryId?: number;
  regionId?: number;
  cityId?: number;
  priceMin?: number;
  priceMax?: number;
  filters?: Record<string, string>;
}

export async function createTrackedSearch(
  client: OlxClient,
  params: CreateTrackingParams,
): Promise<{ trackedSearch: TrackedSearch; initialSnapshot: PriceSnapshot }> {
  const db = getDb();
  const id = crypto.randomUUID();
  const country = params.country ?? "pl";

  const search: Omit<TrackedSearch, "createdAt" | "updatedAt"> = {
    id,
    name: params.name,
    country,
    query: params.query ?? null,
    categoryId: params.categoryId ?? null,
    regionId: params.regionId ?? null,
    cityId: params.cityId ?? null,
    priceMin: params.priceMin ?? null,
    priceMax: params.priceMax ?? null,
    filtersJson: params.filters ? JSON.stringify(params.filters) : null,
  };

  insertTrackedSearch(db, search);

  const snapshot = await takeSnapshot(client, id);

  const trackedSearch = getTrackedSearch(db, id)!;
  return { trackedSearch, initialSnapshot: snapshot };
}

export async function takeSnapshot(
  client: OlxClient,
  trackingId: string,
): Promise<PriceSnapshot> {
  const db = getDb();
  const tracked = getTrackedSearch(db, trackingId);
  if (!tracked) {
    throw new Error(`Tracked search not found: ${trackingId}`);
  }

  const searchParams: SearchParams = {
    query: tracked.query ?? undefined,
    categoryId: tracked.categoryId ?? undefined,
    regionId: tracked.regionId ?? undefined,
    cityId: tracked.cityId ?? undefined,
    priceMin: tracked.priceMin ?? undefined,
    priceMax: tracked.priceMax ?? undefined,
    country: tracked.country,
    limit: 40,
    sortBy: "created_at:desc",
  };

  const result = await searchOffers(client, searchParams);
  const prices = result.offers
    .map((o) => o.price)
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);

  const today = new Date().toISOString().split("T")[0]!;

  const avgPrice = prices.length > 0
    ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
    : null;

  const medianPrice = prices.length > 0
    ? prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1]! + prices[prices.length / 2]!) / 2
      : prices[Math.floor(prices.length / 2)]!
    : null;

  const snapshotId = insertPriceSnapshot(db, {
    trackingId,
    snapshotDate: today,
    totalOffers: result.totalCount,
    avgPrice,
    medianPrice,
    minPrice: prices.length > 0 ? prices[0]! : null,
    maxPrice: prices.length > 0 ? prices[prices.length - 1]! : null,
  });

  if (result.offers.length > 0) {
    insertSnapshotOffers(
      db,
      result.offers.map((o) => ({
        snapshotId,
        offerId: o.id,
        title: o.title,
        price: o.price,
        currency: o.currency,
        url: o.url,
      })),
    );
  }

  // Update tracked_search updated_at
  db.prepare("UPDATE tracked_searches SET updated_at = datetime('now') WHERE id = ?").run(
    trackingId,
  );

  return getSnapshots(db, trackingId).find((s) => s.id === snapshotId)!;
}

export function getPriceHistory(trackingId: string): PriceHistory {
  const db = getDb();
  const tracked = getTrackedSearch(db, trackingId);
  if (!tracked) {
    throw new Error(`Tracked search not found: ${trackingId}`);
  }

  return {
    trackedSearch: tracked,
    snapshots: getSnapshots(db, trackingId),
  };
}

export function isSnapshotStale(trackingId: string): boolean {
  const db = getDb();
  const latest = getLatestSnapshot(db, trackingId);
  if (!latest) return true;
  const today = new Date().toISOString().split("T")[0]!;
  return latest.snapshotDate !== today;
}
