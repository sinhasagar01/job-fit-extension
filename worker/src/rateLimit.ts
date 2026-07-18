// Rate-limit counters in KV. Design notes that must not drift:
//
// KV-WRITE BUDGET: a SUCCESSFUL /score writes THREE counters (token, IP,
// global). Cloudflare free-plan KV allows ~1,000 writes/day; at the 200/day
// global cap that is 200 × 3 = 600 writes worst case — comfortably under 1,000.
// Do NOT add a fourth per-success counter without raising the plan or batching
// writes; it would blow this budget. Rejected requests read only (no writes),
// so retries and abuse never consume the write quota.
//
// RETENTION: counters store only a number keyed by { token|ipHash, date }. No
// request content ever touches KV. The IP is SHA-256-hashed so no raw address
// is persisted.

const TTL_SECONDS = 172_800; // 48h — date-stamped keys self-clean

/** UTC calendar day, `YYYY-MM-DD`, so the day boundary is consistent across edge locations. */
export function utcDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** SHA-256 the IP (16 hex chars is ample for a daily counter key) so no raw address is stored. */
export async function hashIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < 8; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

/** Current count for a key (0 when unset or unparseable). Read-only — never writes. */
export async function readCount(kv: KVNamespace, key: string): Promise<number> {
  const v = await kv.get(key);
  if (v === null) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Persist `current + 1`. Callers pass the value they already read for the gate
 * check, so a proceeding request does exactly one write per counter (no second
 * read).
 *
 * BOUNDED-OVERSHOOT RACE (accepted, decided in the plan): KV is eventually
 * consistent and read→write isn't atomic, so N concurrent requests can each
 * read a global count below the cap and all proceed, overshooting the 200/day
 * cap by up to the concurrency. At ~$0.001/check that's a ~$0.005 worst case.
 * A Durable Object would make the cap exact but isn't worth it at this scale.
 */
export async function writeIncremented(kv: KVNamespace, key: string, current: number): Promise<void> {
  await kv.put(key, String(current + 1), { expirationTtl: TTL_SECONDS });
}
