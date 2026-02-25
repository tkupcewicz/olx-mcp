import path from "node:path";

export interface CountryConfig {
  code: string;
  baseUrl: string;
  partnerBaseUrl: string;
  authorizationUrl: string;
  tokenUrl: string;
  currency: string;
  locale: string;
  name: string;
}

export const COUNTRIES: Record<string, CountryConfig> = {
  pl: {
    code: "pl",
    baseUrl: "https://www.olx.pl/api/v1",
    partnerBaseUrl: "https://www.olx.pl/api/partner",
    authorizationUrl: "https://www.olx.pl/oauth/authorize",
    tokenUrl: "https://www.olx.pl/oauth/token",
    currency: "PLN",
    locale: "pl",
    name: "Poland",
  },
  bg: {
    code: "bg",
    baseUrl: "https://www.olx.bg/api/v1",
    partnerBaseUrl: "https://www.olx.bg/api/partner",
    authorizationUrl: "https://www.olx.bg/oauth/authorize",
    tokenUrl: "https://www.olx.bg/oauth/token",
    currency: "BGN",
    locale: "bg",
    name: "Bulgaria",
  },
  ro: {
    code: "ro",
    baseUrl: "https://www.olx.ro/api/v1",
    partnerBaseUrl: "https://www.olx.ro/api/partner",
    authorizationUrl: "https://www.olx.ro/oauth/authorize",
    tokenUrl: "https://www.olx.ro/oauth/token",
    currency: "RON",
    locale: "ro",
    name: "Romania",
  },
  pt: {
    code: "pt",
    baseUrl: "https://www.olx.pt/api/v1",
    partnerBaseUrl: "https://www.olx.pt/api/partner",
    authorizationUrl: "https://www.olx.pt/oauth/authorize",
    tokenUrl: "https://www.olx.pt/oauth/token",
    currency: "EUR",
    locale: "pt",
    name: "Portugal",
  },
  ua: {
    code: "ua",
    baseUrl: "https://www.olx.ua/api/v1",
    partnerBaseUrl: "https://www.olx.ua/api/partner",
    authorizationUrl: "https://www.olx.ua/oauth/authorize",
    tokenUrl: "https://www.olx.ua/oauth/token",
    currency: "UAH",
    locale: "uk",
    name: "Ukraine",
  },
  kz: {
    code: "kz",
    baseUrl: "https://www.olx.kz/api/v1",
    partnerBaseUrl: "https://www.olx.kz/api/partner",
    authorizationUrl: "https://www.olx.kz/oauth/authorize",
    tokenUrl: "https://www.olx.kz/oauth/token",
    currency: "KZT",
    locale: "ru",
    name: "Kazakhstan",
  },
};

export const DEFAULT_COUNTRY = process.env.OLX_DEFAULT_COUNTRY ?? "pl";

export const DB_PATH =
  process.env.OLX_DB_PATH ?? path.join("data", "olx-mcp.db");

export const RATE_LIMIT_CAPACITY = Number(
  process.env.OLX_RATE_LIMIT_CAPACITY ?? 4000,
);

export const RATE_LIMIT_WINDOW_MS = Number(
  process.env.OLX_RATE_LIMIT_WINDOW_MS ?? 300_000,
);

// OAuth / Partner API configuration
export const OLX_CLIENT_ID = process.env.OLX_CLIENT_ID ?? "";
export const OLX_CLIENT_SECRET = process.env.OLX_CLIENT_SECRET ?? "";
export const OLX_API_KEY = process.env.OLX_API_KEY ?? "";
export const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? "http://localhost:3000";
export const MCP_HTTP_PORT = Number(process.env.MCP_HTTP_PORT ?? 3000);

export function getCountryConfig(country: string): CountryConfig {
  const config = COUNTRIES[country.toLowerCase()];
  if (!config) {
    throw new Error(
      `Unknown country: ${country}. Supported: ${Object.keys(COUNTRIES).join(", ")}`,
    );
  }
  return config;
}
