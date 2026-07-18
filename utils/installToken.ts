const INSTALL_TOKEN_KEY = 'installToken';

/**
 * The per-install anonymous token the extension sends to the hosted Worker for
 * rate limiting. Generated ONCE on first use with crypto.randomUUID() and reused
 * forever — if it regenerated per session the per-token daily limit would be
 * meaningless. Anonymous: not tied to any identity, only to this install.
 */
export async function getInstallToken(): Promise<string> {
  const { [INSTALL_TOKEN_KEY]: existing } = await browser.storage.local.get(INSTALL_TOKEN_KEY);
  if (typeof existing === 'string' && existing.length > 0) return existing;
  const token = crypto.randomUUID();
  await browser.storage.local.set({ [INSTALL_TOKEN_KEY]: token });
  return token;
}
