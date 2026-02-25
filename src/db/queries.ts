import type Database from "better-sqlite3";
import type {
  TrackedSearch,
  PriceSnapshot,
  SnapshotOffer,
} from "../types/domain.js";

export function insertTrackedSearch(
  db: Database.Database,
  search: Omit<TrackedSearch, "createdAt" | "updatedAt">,
): void {
  db.prepare(
    `INSERT INTO tracked_searches (id, name, country, query, category_id, region_id, city_id, price_min, price_max, filters_json)
     VALUES (@id, @name, @country, @query, @categoryId, @regionId, @cityId, @priceMin, @priceMax, @filtersJson)`,
  ).run(search);
}

export function getTrackedSearch(
  db: Database.Database,
  id: string,
): TrackedSearch | undefined {
  return db
    .prepare(
      `SELECT id, name, country, query, category_id as categoryId, region_id as regionId,
              city_id as cityId, price_min as priceMin, price_max as priceMax,
              filters_json as filtersJson, created_at as createdAt, updated_at as updatedAt
       FROM tracked_searches WHERE id = ?`,
    )
    .get(id) as TrackedSearch | undefined;
}

export function getAllTrackedSearches(
  db: Database.Database,
): TrackedSearch[] {
  return db
    .prepare(
      `SELECT id, name, country, query, category_id as categoryId, region_id as regionId,
              city_id as cityId, price_min as priceMin, price_max as priceMax,
              filters_json as filtersJson, created_at as createdAt, updated_at as updatedAt
       FROM tracked_searches ORDER BY updated_at DESC`,
    )
    .all() as TrackedSearch[];
}

export function deleteTrackedSearch(
  db: Database.Database,
  id: string,
): boolean {
  const result = db
    .prepare("DELETE FROM tracked_searches WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

export function insertPriceSnapshot(
  db: Database.Database,
  snapshot: Omit<PriceSnapshot, "id" | "createdAt">,
): number {
  const result = db
    .prepare(
      `INSERT INTO price_snapshots (tracking_id, snapshot_date, total_offers, avg_price, median_price, min_price, max_price)
       VALUES (@trackingId, @snapshotDate, @totalOffers, @avgPrice, @medianPrice, @minPrice, @maxPrice)`,
    )
    .run(snapshot);
  return Number(result.lastInsertRowid);
}

export function getSnapshots(
  db: Database.Database,
  trackingId: string,
): PriceSnapshot[] {
  return db
    .prepare(
      `SELECT id, tracking_id as trackingId, snapshot_date as snapshotDate,
              total_offers as totalOffers, avg_price as avgPrice, median_price as medianPrice,
              min_price as minPrice, max_price as maxPrice, created_at as createdAt
       FROM price_snapshots WHERE tracking_id = ? ORDER BY snapshot_date ASC`,
    )
    .all(trackingId) as PriceSnapshot[];
}

export function getLatestSnapshot(
  db: Database.Database,
  trackingId: string,
): PriceSnapshot | undefined {
  return db
    .prepare(
      `SELECT id, tracking_id as trackingId, snapshot_date as snapshotDate,
              total_offers as totalOffers, avg_price as avgPrice, median_price as medianPrice,
              min_price as minPrice, max_price as maxPrice, created_at as createdAt
       FROM price_snapshots WHERE tracking_id = ? ORDER BY snapshot_date DESC LIMIT 1`,
    )
    .get(trackingId) as PriceSnapshot | undefined;
}

export function insertSnapshotOffers(
  db: Database.Database,
  offers: Omit<SnapshotOffer, "id">[],
): void {
  const stmt = db.prepare(
    `INSERT INTO snapshot_offers (snapshot_id, offer_id, title, price, currency, url)
     VALUES (@snapshotId, @offerId, @title, @price, @currency, @url)`,
  );
  const insertMany = db.transaction((items: Omit<SnapshotOffer, "id">[]) => {
    for (const item of items) {
      stmt.run(item);
    }
  });
  insertMany(offers);
}

export function getSnapshotOffers(
  db: Database.Database,
  snapshotId: number,
): SnapshotOffer[] {
  return db
    .prepare(
      `SELECT id, snapshot_id as snapshotId, offer_id as offerId, title, price, currency, url
       FROM snapshot_offers WHERE snapshot_id = ?`,
    )
    .all(snapshotId) as SnapshotOffer[];
}
