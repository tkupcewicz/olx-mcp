import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { DB_PATH } from "../config.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS tracked_searches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'pl',
    query TEXT,
    category_id INTEGER,
    region_id INTEGER,
    city_id INTEGER,
    price_min REAL,
    price_max REAL,
    filters_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS price_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_id TEXT NOT NULL REFERENCES tracked_searches(id) ON DELETE CASCADE,
    snapshot_date TEXT NOT NULL,
    total_offers INTEGER NOT NULL DEFAULT 0,
    avg_price REAL,
    median_price REAL,
    min_price REAL,
    max_price REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tracking_id, snapshot_date)
  );

  CREATE TABLE IF NOT EXISTS snapshot_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL REFERENCES price_snapshots(id) ON DELETE CASCADE,
    offer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    price REAL,
    currency TEXT NOT NULL,
    url TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_snapshots_tracking ON price_snapshots(tracking_id);
  CREATE INDEX IF NOT EXISTS idx_snapshot_offers_snapshot ON snapshot_offers(snapshot_id);
`;

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
