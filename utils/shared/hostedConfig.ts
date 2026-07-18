// Origin of the hosted scoring Worker. Pure (no import.meta) so wxt.config.ts
// (Node) can import these for host_permissions too. The runtime switch between
// dev/prod lives in the extension code (utils/hostedScoringClient.ts), which
// has import.meta.env; here we only expose the two constants.

export const WORKER_ORIGIN_DEV = 'http://localhost:8787';

// The deployed Worker origin. host_permissions uses `${WORKER_ORIGIN_PROD}/*`,
// i.e. this EXACT origin — not a *.workers.dev wildcard (narrowest grant).
export const WORKER_ORIGIN_PROD = 'https://jobfit-score-worker.sinhasagar.workers.dev';
