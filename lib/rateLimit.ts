const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const hit = buckets.get(key)

  if (!hit || now >= hit.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (hit.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((hit.resetAt - now) / 1000) }
  }

  hit.count += 1
  return { ok: true }
}
