import { getCountryConfig } from "../config.js";
import { OLX_API_KEY } from "../config.js";
import type { RateLimiterPool } from "./rate-limiter.js";

const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 500;

export class PartnerApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = "PartnerApiError";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

export class AuthenticatedOlxClient {
  constructor(
    private readonly accessToken: string,
    private readonly rateLimiters: RateLimiterPool,
  ) {}

  async get<T>(
    path: string,
    country: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const config = getCountryConfig(country);
    const url = new URL(`${config.partnerBaseUrl}${path}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const limiter = this.rateLimiters.get(country);
    await limiter.acquire();

    return this.fetchWithRetry<T>(url.toString(), "GET");
  }

  async post<T>(
    path: string,
    country: string,
    body?: unknown,
  ): Promise<T> {
    const config = getCountryConfig(country);
    const url = `${config.partnerBaseUrl}${path}`;

    const limiter = this.rateLimiters.get(country);
    await limiter.acquire();

    return this.fetchWithRetry<T>(url, "POST", body);
  }

  async put<T>(
    path: string,
    country: string,
    body?: unknown,
  ): Promise<T> {
    const config = getCountryConfig(country);
    const url = `${config.partnerBaseUrl}${path}`;

    const limiter = this.rateLimiters.get(country);
    await limiter.acquire();

    return this.fetchWithRetry<T>(url, "PUT", body);
  }

  async delete(
    path: string,
    country: string,
  ): Promise<void> {
    const config = getCountryConfig(country);
    const url = `${config.partnerBaseUrl}${path}`;

    const limiter = this.rateLimiters.get(country);
    await limiter.acquire();

    await this.fetchWithRetry<void>(url, "DELETE");
  }

  private async fetchWithRetry<T>(
    url: string,
    method: string,
    body?: unknown,
    attempt = 0,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/json",
      "User-Agent": "OLX-MCP-Server/1.0",
    };

    if (OLX_API_KEY) {
      headers["X-API-KEY"] = OLX_API_KEY;
    }

    const init: RequestInit = { method, headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);

    if (response.ok) {
      if (method === "DELETE" && response.status === 204) {
        return undefined as T;
      }
      return (await response.json()) as T;
    }

    if (response.status >= 500 && attempt < MAX_RETRIES) {
      const backoff = INITIAL_BACKOFF_MS * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return this.fetchWithRetry<T>(url, method, body, attempt + 1);
    }

    const responseBody = await response.text().catch(() => "");
    throw new PartnerApiError(
      `Partner API ${response.status}: ${response.statusText}${responseBody ? ` — ${responseBody.slice(0, 200)}` : ""}`,
      response.status,
      url,
    );
  }
}
