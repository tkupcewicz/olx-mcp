/**
 * Token bucket rate limiter.
 * Starts full at `capacity` tokens, refills linearly over `windowMs`.
 * Each request consumes 1 token. When empty, callers must wait.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly windowMs: number;

  constructor(capacity: number, windowMs: number) {
    this.capacity = capacity;
    this.windowMs = windowMs;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / this.windowMs) * this.capacity;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /** Returns ms to wait before a token is available, or 0 if available now. */
  getWaitTime(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    const deficit = 1 - this.tokens;
    return Math.ceil((deficit / this.capacity) * this.windowMs);
  }

  /** Consume a token. Throws if none available — call getWaitTime() first or use acquire(). */
  consume(): void {
    this.refill();
    if (this.tokens < 1) {
      throw new Error("Rate limit exceeded — no tokens available");
    }
    this.tokens -= 1;
  }

  /** Wait for a token and consume it. */
  async acquire(): Promise<void> {
    const waitMs = this.getWaitTime();
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    this.refill();
    this.tokens -= 1;
  }

  /** Current available tokens (for diagnostics). */
  get available(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

/**
 * Manages per-country rate limiter instances.
 */
export class RateLimiterPool {
  private limiters = new Map<string, RateLimiter>();
  private readonly capacity: number;
  private readonly windowMs: number;

  constructor(capacity: number, windowMs: number) {
    this.capacity = capacity;
    this.windowMs = windowMs;
  }

  get(country: string): RateLimiter {
    let limiter = this.limiters.get(country);
    if (!limiter) {
      limiter = new RateLimiter(this.capacity, this.windowMs);
      this.limiters.set(country, limiter);
    }
    return limiter;
  }
}
