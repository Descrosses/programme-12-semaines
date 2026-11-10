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
      /*
       * Vide, et `globIgnores` ci-dessous écarte le dossier des icônes.
       *
       * Les icônes ne servent qu'au système : Safari télécharge
       * `icone-apple-touch.png` au moment où l'on ajoute le raccourci, et
       * l'appli n'en affiche aucune. Les pré-cacher reviendrait à transporter
       * des fichiers qu'elle ne regarde jamais.
       *
       * L'exclusion ne porte toutefois QUE sur l'icône Apple et le favicon :
       * les trois icônes déclarées dans le manifeste sont ajoutées au
       * pré-cache par le plugin lui-même, hors de `globPatterns`, et il n'y a
       * pas de réglage pour l'en empêcher. C'est d'ailleurs défendable — une
       * invite d'installation hors ligne a besoin de son icône.
       */
      includeAssets: [],
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
         *
         * Les FICHES DE MOUVEMENT, elles, sont pré-cachées, et le second
         * motif ci-dessous ne sert qu'à ça. Ce n'est pas une exception
         * arbitraire au raisonnement précédent, c'est son application : une
         * photo d'ambiance qui manque laisse l'écran complet, une fiche qui
         * manque laisse l'utilisateur devant une machine sans savoir quoi en
         * faire. Et le moment où l'on se pose la question est précisément
         * celui où le réseau n'est pas là.
         *
         * Le prix est assumé : l'installation passe d'environ 760 Ko à 4,9 Mo
         * (7,7 Mo avec les planches de POWER 12).
         * C'est un téléchargement unique, et les planches portent du texte —
         * les recompresser plus petit coûterait la lisibilité des points clés,
         * c'est-à-dire la seule chose qu'elles servent à montrer.
         *
         * Les planches de POWER 12 (préfixe `power12-`, environ 2,8 Mo pour
         * trente-six) passent par le même motif, pour la même raison. Celles des
         * deux programmes sont téléchargées quel que soit le programme suivi :
         * les séparer demanderait deux services workers ou un pré-cache
         * conditionnel, pour économiser un téléchargement unique.
         */
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}', 'fiches/*.webp'],
        globIgnores: ['**/icons/**'],
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
        /*
         * Le NOM AFFICHÉ change, pas l'identité technique.
         *
         * `start_url`, `scope` et le chemin de base restent ceux du dépôt :
         * les raccourcis déjà posés sur un écran d'accueil pointent dessus, et
         * les changer les casserait. Seuls le nom, le nom court et la
         * description sont de l'affichage.
         */
        name: 'MAJK',
        short_name: 'MAJK',
        description:
          'MAJK — tes programmes d’entraînement, ta progression et tes performances, hors ligne.',
        lang: 'fr',
        dir: 'ltr',
        start_url: base,
        scope: base,
        // Standalone : indispensable pour que le chrono tienne l'écran allumé
        // et que les notifications locales soient autorisées sur iOS.
        display: 'standalone',
        orientation: 'portrait',
        /*
         * Le graphite de la plateforme, et non le bleu nuit de POWER 12.
         *
         * Ces deux couleurs ne décorent rien : `background_color` est le fond
         * de l'écran de lancement, derrière l'icône. Laisser le bleu nuit y
         * aurait posé l'icône graphite sur un carré bleu pendant une seconde,
         * à chaque ouverture.
         */
        background_color: '#0c0e11',
        theme_color: '#0c0e11',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          { src: 'icons/majk-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/majk-512.png', sizes: '512x512', type: 'image/png' },
          /*
           * La version « maskable » n'est pas la même image recadrée : Android
           * peut découper l'icône en cercle, en goutte ou en losange, et ne
           * garantit que le cercle central de 80 %. Le logo y occupe donc 76 %
           * du carré, entouré du graphite de la marque — sinon les deux cartes
           * se faisaient trancher selon le téléphone.
           */
          {
            src: 'icons/majk-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
