import { getCountryConfig } from "../config.js";
import type { RateLimiterPool } from "./rate-limiter.js";

const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 500;

export class OlxApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = "OlxApiError";
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

export class OlxClient {
  constructor(private readonly rateLimiters: RateLimiterPool) {}

  async get<T>(
    path: string,
    country: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const config = getCountryConfig(country);
    const url = new URL(`${config.baseUrl}${path}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const limiter = this.rateLimiters.get(country);
    await limiter.acquire();

    return this.fetchWithRetry<T>(url.toString());
  }

  private async fetchWithRetry<T>(
    url: string,
    attempt = 0,
  ): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "OLX-MCP-Server/1.0",
      },
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (response.status >= 500 && attempt < MAX_RETRIES) {
      const backoff = INITIAL_BACKOFF_MS * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return this.fetchWithRetry<T>(url, attempt + 1);
    }

    const body = await response.text().catch(() => "");
    throw new OlxApiError(
      `OLX API ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`,
      response.status,
      url,
    );
  }
}
