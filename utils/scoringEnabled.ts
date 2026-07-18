/**
 * Whether the "Am I Fit?" primary path may be enabled.
 *
 * A confident detection (`uncertain: false`) needs only a JD present and a
 * non-stale panel — the long-standing rule. An *uncertain* detection (the
 * readability fallback's phrase-only tier) additionally requires the user to
 * explicitly confirm ("score it anyway"), so a thin, maybe-not-a-job page can
 * never auto-enable a scored check — which, once scoring is hosted, is money.
 *
 * Single source of truth for the button's enabled state; the panel must not
 * re-derive it.
 */
export function scoringEnabled(o: {
  hasJd: boolean;
  stale: boolean;
  uncertain: boolean;
  confirmed: boolean;
}): boolean {
  return o.hasJd && !o.stale && (!o.uncertain || o.confirmed);
}
