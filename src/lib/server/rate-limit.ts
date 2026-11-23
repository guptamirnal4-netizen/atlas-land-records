import "server-only";

// Best-effort, per-instance limiter. On serverless each warm instance keeps
// its own counters, so this blunts abuse of the proxy rather than guaranteeing
// a global cap - the backend's concurrent-session limit is the hard stop.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 40;
const hits = new Map<string, number[]>();

export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return recent.length > MAX_REQUESTS;
}
