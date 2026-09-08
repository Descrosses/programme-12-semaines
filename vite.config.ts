import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * `base` : GitHub Pages sert le site sous /<nom-du-dépôt>/.
 * Si tu renommes le dépôt, c'est la seule ligne à changer — le workflow de
 * déploiement passe la bonne valeur automatiquement via GITHUB_PAGES_BASE.
 */
const base = process.env.GITHUB_PAGES_BASE ?? '/programme-12-semaines/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/apple-touch-icon.png'],
      workbox: {
        /*
         * Tout est mis en cache à la première ouverture : polices comprises.
         * Après ça, l'appli fonctionne à 100 % hors ligne — c'est la condition
         * pour qu'elle serve en salle, où le réseau est aléatoire.
         */
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Programme 12 semaines',
        short_name: '12 semaines',
        description:
          'Programme de préparation physique de 12 semaines : séances, charges, readiness et progression, hors ligne.',
        lang: 'fr',
        dir: 'ltr',
        start_url: base,
        scope: base,
        // Standalone : indispensable pour que le chrono tienne l'écran allumé
        // et que les notifications locales soient autorisées sur iOS.
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0d1014',
        theme_color: '#0d1014',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
