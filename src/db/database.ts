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

  CREATE TABLE IF NOT EXISTS watches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    query TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'pl',
    category_id INTEGER,
    price_min REAL,
    price_max REAL,
    alert_below REAL,
    title_must_contain TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS watch_offers (
    config_id TEXT NOT NULL,
    offer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    price REAL,
    currency TEXT NOT NULL,
    url TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (config_id, offer_id)
  );

  CREATE INDEX IF NOT EXISTS idx_watch_offers_config ON watch_offers(config_id);

  CREATE TABLE IF NOT EXISTS oauth_clients (
    client_id TEXT PRIMARY KEY,
    client_secret TEXT,
    client_secret_expires_at INTEGER,
    redirect_uris TEXT NOT NULL,
    client_name TEXT,
    grant_types TEXT NOT NULL DEFAULT 'authorization_code,refresh_token',
    response_types TEXT NOT NULL DEFAULT 'code',
    token_endpoint_auth_method TEXT NOT NULL DEFAULT 'client_secret_post',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS oauth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mcp_client_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at INTEGER NOT NULL,
    scopes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_oauth_tokens_access ON oauth_tokens(access_token);
  CREATE INDEX IF NOT EXISTS idx_oauth_tokens_client ON oauth_tokens(mcp_client_id);

  CREATE TABLE IF NOT EXISTS oauth_auth_sessions (
    state TEXT PRIMARY KEY,
    mcp_client_id TEXT NOT NULL,
    mcp_redirect_uri TEXT NOT NULL,
    mcp_state TEXT,
    code_challenge TEXT NOT NULL,
    scopes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
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
