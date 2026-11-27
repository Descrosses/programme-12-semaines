/**
 * Les planches POWER ont été RELUES une par une : aucune marque d'un tiers.
 *
 * Guillaume, 26 novembre : « sur des fiches techniques dans POWER il y avait
 * le logo NFL en fond ». Il était sur 35 planches sur 39 (102 écussons, sur
 * le mur du fond : l'image est générée, le logo n'a rien à y faire). Ils ont
 * été effacés par retouche locale du mur — athlète, matériel et bannière
 * POWER intacts — puis une détection automatique n'en a plus trouvé aucun.
 *
 * Un test ne sait pas « voir » un logo. Celui-ci fige donc l'EMPREINTE de
 * chaque planche relue : une planche remplacée ou ajoutée le fait tomber
 * tant qu'elle n'a pas été regardée (logo NFL, mais aussi toute autre marque)
 * et inscrite dans `__fixtures__/planches-power-relues.json`. Remettre une
 * ancienne planche à logo le fait tomber aussi.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import relues from './__fixtures__/planches-power-relues.json';

const DOSSIER = new URL('../../public/fiches/', import.meta.url);
const planches = readdirSync(DOSSIER)
  .filter((f) => f.startsWith('power12-') && f.endsWith('.webp'))
  .sort();
const empreinte = (f: string) =>
  createHash('sha256')
    .update(readFileSync(new URL(f, DOSSIER)))
    .digest('hex');

describe('planches POWER : relues, sans marque d’un tiers', () => {
  it('chaque planche livrée est une planche relue (44 au 27 novembre)', () => {
    expect(planches).toEqual(Object.keys(relues).sort());
    expect(planches.length).toBeGreaterThanOrEqual(44);
  });

  it('aucune n’a changé depuis sa relecture', () => {
    const changees = planches.filter((f) => empreinte(f) !== (relues as Record<string, string>)[f]);
    expect(
      changees,
      'Planche remplacée : regarde-la (logo, marque) puis mets son empreinte à jour.',
    ).toEqual([]);
  });
});
