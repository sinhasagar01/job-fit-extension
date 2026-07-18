// Worker↔extension wire protocol constants. Shared so the header name lives in
// exactly one place: the Worker reads it for per-install rate limiting, and the
// extension (Task 4.2) sends it. Changing it here changes both sides at once.

/** Header carrying the per-install anonymous token (generated client-side, stored in chrome.storage.local). */
export const INSTALL_TOKEN_HEADER = 'X-JobFit-Token';
