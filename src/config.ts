import path from "node:path";

export interface CountryConfig {
  code: string;
  baseUrl: string;
  currency: string;
  locale: string;
  name: string;
}

export const COUNTRIES: Record<string, CountryConfig> = {
  pl: {
    code: "pl",
    baseUrl: "https://www.olx.pl/api/v1",
    currency: "PLN",
    locale: "pl",
    name: "Poland",
  },
  bg: {
    code: "bg",
    baseUrl: "https://www.olx.bg/api/v1",
    currency: "BGN",
    locale: "bg",
    name: "Bulgaria",
  },
  ro: {
    code: "ro",
    baseUrl: "https://www.olx.ro/api/v1",
    currency: "RON",
    locale: "ro",
    name: "Romania",
  },
  pt: {
    code: "pt",
    baseUrl: "https://www.olx.pt/api/v1",
    currency: "EUR",
    locale: "pt",
    name: "Portugal",
  },
  ua: {
    code: "ua",
    baseUrl: "https://www.olx.ua/api/v1",
    currency: "UAH",
    locale: "uk",
    name: "Ukraine",
  },
  kz: {
    code: "kz",
    baseUrl: "https://www.olx.kz/api/v1",
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

export function getCountryConfig(country: string): CountryConfig {
  const config = COUNTRIES[country.toLowerCase()];
  if (!config) {
    throw new Error(
      `Unknown country: ${country}. Supported: ${Object.keys(COUNTRIES).join(", ")}`,
    );
  }
  return config;
}
