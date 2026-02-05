/**
 * Simple in-memory rate limit per IP.
 * For production, use Redis or similar.
 */

const windowMs = 60 * 1000; // 1 minute
const maxRequests = 30;
const store = new Map<string, { count: number; resetAt: number }>();

function getKey(ip: string): string {
  return ip || "anonymous";
}

export function checkRateLimit(ip: string): { ok: boolean; remaining: number } {
  const key = getKey(ip);
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1 };
  }

  if (now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { ok: true, remaining: maxRequests - 1 };
  }

  entry.count += 1;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { ok: entry.count <= maxRequests, remaining };
}
