// Configuration Astro.
// ⚠️ Seule ligne à modifier ici : `site`, l'adresse finale de ton site
// (sert au sitemap et aux aperçus sur les réseaux sociaux).
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://REMPLACER-PAR-TON-DOMAINE.netlify.app',
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      // Les pages de remerciement (après paiement) ne doivent pas être référencées.
      filter: (page) => !page.includes('/merci/'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
