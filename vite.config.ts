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
      /*
       * `prompt` et non `autoUpdate` : une mise à jour automatique recharge la
       * page sans prévenir, ce qui pourrait arriver en plein milieu d'une
       * série. Ici l'appli affiche un bandeau et attend un appui.
       */
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icons/apple-touch-icon.png'],
      workbox: {
        /*
         * Tout est mis en cache à la première ouverture : polices comprises.
         * Après ça, l'appli fonctionne à 100 % hors ligne — c'est la condition
         * pour qu'elle serve en salle, où le réseau est aléatoire.
         *
         * Les photos d'ambiance (.webp) sont volontairement HORS de cette
         * liste. Les pré-charger ferait passer l'installation de 670 Ko à
         * 1,7 Mo pour de la décoration, sur un réseau de vestiaire. Elles
         * passent par la règle d'exécution ci-dessous : la première fois
         * qu'un écran s'ouvre en ligne, sa photo est gardée ; ensuite elle
         * est là hors ligne aussi. Et si elle manque, l'écran reste complet
         * — c'est tout l'intérêt du manifeste `visuels.ts`.
         */
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'visuels',
              // 14 fichiers au total (7 visuels × 2 tailles) ; 20 laisse de la
              // marge pour une image remplacée sans purger le reste.
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
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
        background_color: '#061426',
        theme_color: '#061426',
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
