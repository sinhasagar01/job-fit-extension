import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'JobFit',
    version: '1.0.0',
    description: 'JobFit — instant resume-to-job fit scoring, right on the job page',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['https://generativelanguage.googleapis.com/*', 'https://api.groq.com/*'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
