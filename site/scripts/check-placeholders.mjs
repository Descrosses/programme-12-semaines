// Liste tout ce qu'il reste à compléter avant la mise en ligne.
// Utilisation : npm run check-placeholders
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MOTIFS = ['PRIX_A_DEFINIR', 'REMPLACER', 'À COMPLÉTER', 'remplacer-code'];
const DOSSIERS = ['src', 'public', 'astro.config.mjs'];
let total = 0;

function parcourir(chemin) {
  if (statSync(chemin).isDirectory()) {
    for (const f of readdirSync(chemin)) parcourir(join(chemin, f));
    return;
  }
  if (!/\.(astro|ts|md|mjs|txt)$/.test(chemin) || chemin.includes('check-placeholders')) return;
  readFileSync(chemin, 'utf8').split('\n').forEach((ligne, i) => {
    if (MOTIFS.some((m) => ligne.includes(m)) && !ligne.trim().startsWith('//') && !ligne.trim().startsWith('*')) {
      console.log(`${chemin}:${i + 1}  ${ligne.trim().slice(0, 110)}`);
      total++;
    }
  });
}

DOSSIERS.forEach(parcourir);
console.log(total ? `\n${total} élément(s) à compléter.` : '\n✅ Plus rien à compléter.');
