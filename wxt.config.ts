import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { WORKER_ORIGIN_DEV, WORKER_ORIGIN_PROD } from './utils/shared/hostedConfig';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: (env) => {
    // The dev server (`wxt` = serve) is the only place we want the localhost
    // Worker host; `wxt build` is always command 'build'. Prod gets the deployed
    // origin only once it's a real https:// URL — a placeholder is omitted so
    // prod manifests stay valid and localhost never ships to the store.
    const isDev = env.command === 'serve';
    const workerHost = isDev
      ? [`${WORKER_ORIGIN_DEV}/*`]
      : WORKER_ORIGIN_PROD.startsWith('https://')
        ? [`${WORKER_ORIGIN_PROD}/*`]
        : [];
    return {
      name: 'JobFit',
      version: '1.3.0',
      description: 'JobFit — instant resume-to-job fit scoring, right on the job page',
      permissions: ['storage', 'activeTab', 'scripting', 'sidePanel'],
      // Toolbar icon with no popup — clicking it opens the side panel (see background.ts).
      action: {},
      host_permissions: [
        'https://generativelanguage.googleapis.com/*',
        'https://api.groq.com/*',
        ...workerHost,
      ],
    };
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
