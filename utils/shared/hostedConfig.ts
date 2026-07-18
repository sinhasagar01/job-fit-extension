// Origin of the hosted scoring Worker. Pure (no import.meta) so wxt.config.ts
// (Node) can import these for host_permissions too. The runtime switch between
// dev/prod lives in the extension code (utils/hostedScoringClient.ts), which
// has import.meta.env; here we only expose the two constants.

export const WORKER_ORIGIN_DEV = 'http://localhost:8787';

// Set to the deployed origin (https://jobfit-score-worker.<subdomain>.workers.dev)
// before shipping hosted scoring. Until it's a real https:// origin, prod builds
// omit it from host_permissions and hosted scoring is inert in prod.
export const WORKER_ORIGIN_PROD = '__FILL_ON_DEPLOY__';
