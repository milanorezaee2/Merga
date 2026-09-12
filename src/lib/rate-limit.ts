/**
 * Minimal in-memory throttle for the login endpoint.
 *
 * Serverless instances keep their own counters, so this is a cheap first layer (brute-force
 * deterrent), not a distributed limiter. Keys are `ip|email`; failed attempts expire after a
 * sliding window. A successful login clears the key.
 */
interface Bucket {
  fails: number;
  resetAt: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;

const buckets = new Map<string, Bucket>();

function sweep(now: number) {
  if (buckets.size < 512) return; // keep the map small without a timer
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

export function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  return Boolean(b && b.resetAt > now && b.fails >= MAX_FAILS);
}

export function recordFailure(key: string) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) buckets.set(key, { fails: 1, resetAt: now + WINDOW_MS });
  else b.fails += 1;
}

export function clearFailures(key: string) {
  buckets.delete(key);
}

/**
 * Sliding-window quota for endpoints that are called on success rather than on failure (uploads,
 * form posts). Returns false once `limit` calls have been made inside the window. Same caveats as
 * the login throttle: per-instance, in memory, a deterrent rather than a hard guarantee.
 */
export function consumeQuota(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { fails: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.fails >= limit) return false;
  b.fails += 1;
  return true;
}

/** Best-effort client identity behind a proxy (Netlify/Vercel set x-forwarded-for). */export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? "unknown").trim();
}
