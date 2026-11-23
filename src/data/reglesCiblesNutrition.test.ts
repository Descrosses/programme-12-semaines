/**
 * `regles-cibles-nutrition.md` (validé par Guillaume, 23 novembre) = le code.
 *
 * Le .md fait foi : ce test relit ses tableaux et ses valeurs, puis rejoue
 * son exemple calculé (§8) avec le moteur. Si l'un bouge sans l'autre, le
 * déploiement échoue.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calculerCibles } from '../engine/calculCibles';
import {
  ACTIVITE_QUOTIDIENNE,
  AGE_MIN,
  AJUSTEMENT,
  ARRONDI,
  COEFFICIENT_MAX,
  GLUCIDES_ALERTE_G_KG,
  IMC_MIN_PERTE,
  IMC_POIDS_REFERENCE,
  LIPIDES,
  PAR_SEANCE,
  PLANCHERS_KCAL,
  PROTEINES_G_KG,
  SEANCES_MAX,
} from './reglesCiblesNutrition';

const MD = readFileSync(new URL('../../regles-cibles-nutrition.md', import.meta.url), 'utf8');
const section = (debut: string, fin: string) =>
  MD.slice(MD.indexOf(debut), MD.indexOf(fin, MD.indexOf(debut)));
const nb = (t: string) =>
  Number(t.replace(/\s/g, '').replace('−', '-').replace(',', '.').replace('%', ''));
const cellules = (l: string) =>
  l
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());

describe('le .md, tableau par tableau', () => {
  it('§3a — activité quotidienne', () => {
    const s = section('**3a.', '**3b.');
    const lignes = { Assis: 'assis', Debout: 'debout', Physique: 'physique' } as const;
    const pas = ['<5000', '5000-8000', '8000-12000', '>12000', 'nsp'] as const;
    for (const [lib, cle] of Object.entries(lignes)) {
      const l = s.split('\n').find((x) => x.startsWith(`| ${lib} |`))!;
      const v = cellules(l).slice(1).map(nb);
      expect(v, lib).toEqual(pas.map((p) => ACTIVITE_QUOTIDIENNE[cle][p]));
    }
  });

  it('§3b — par séance, « 6 ou plus », plafond', () => {
    const s = section('**3b.', '## 4.');
    const duree = { '< 45 min': '<45', '45–75 min': '45-75', '> 75 min': '>75' } as const;
    for (const [lib, cle] of Object.entries(duree)) {
      const l = s.split('\n').find((x) => x.startsWith(`| ${lib} |`))!;
      expect(nb(cellules(l)[1]!.replace('+', '')), lib).toBe(PAR_SEANCE[cle]);
    }
    expect(s).toContain(`« 6 ou plus » compte pour ${SEANCES_MAX}`);
    expect(s).toContain(
      `Plafond du coefficient total : **${String(COEFFICIENT_MAX).replace('.', ',')}**`,
    );
  });

  it('§4 — objectif et rythme', () => {
    const s = section('## 4.', '## 5.');
    const l = (lib: string) =>
      cellules(s.split('\n').find((x) => x.startsWith(`| ${lib} |`))!)
        .slice(1)
        .map((c) => nb(c.replace('+', '')) / 100);
    expect(l('Perdre du poids')).toEqual([
      AJUSTEMENT.perte.progressif,
      AJUSTEMENT.perte.modere,
      AJUSTEMENT.perte.rapide,
    ]);
    expect(l('Prendre du poids (muscle)')).toEqual([
      AJUSTEMENT.prise.progressif,
      AJUSTEMENT.prise.modere,
      AJUSTEMENT.prise.rapide,
    ]);
    expect(l('Maintenir')).toEqual([0, 0, 0]);
  });

  it('§5 et §6 — chaque valeur écrite est celle du code', () => {
    const v = (x: number) => String(x).replace('.', ',');
    const s5 = section('## 5.', '## 6.').replace(/\s+/g, ' ');
    expect(s5).toContain(`**${v(PROTEINES_G_KG.defaut)} g/kg/j** par défaut`);
    expect(s5).toContain(`**${v(PROTEINES_G_KG.perte)} g/kg/j** pour **toute** perte`);
    expect(s5).toContain(`**IMC ≥ ${IMC_POIDS_REFERENCE.seuil}**`);
    expect(s5).toContain(`un IMC de ${IMC_POIDS_REFERENCE.reference} (taille² × 25)`);
    expect(s5).toContain(
      `**${LIPIDES.part * 100} % des calories**, jamais sous **${v(LIPIDES.minGKg)} g/kg/j**`,
    );
    expect(s5).toContain(`**${GLUCIDES_ALERTE_G_KG} g/kg/j**`);
    expect(s5).toContain(
      `Calories à ${ARRONDI.kcal} kcal près, puis chaque macro à ${ARRONDI.macroG} g près`,
    );
    expect(s5).toContain('**même cible les deux jours.**');
    const s6 = section('## 6.', '## 7.').replace(/\s+/g, ' ');
    expect(s6).toContain(
      `**${PLANCHERS_KCAL.homme.toLocaleString('fr-FR')} kcal (homme)**`.replace(/ /g, ' '),
    );
    expect(s6).toContain(
      `**${PLANCHERS_KCAL.femme.toLocaleString('fr-FR')} kcal (femme)**`.replace(/ /g, ' '),
    );
    expect(s6).toContain(`IMC < ${v(IMC_MIN_PERTE)}`);
    expect(s6).toContain(`moins de ${AGE_MIN} ans`);
  });
});

describe('§8 — l’exemple du .md, rejoué par le moteur', () => {
  it('2 150 kcal, 180 g, 60 g, 225 g — et proposable', () => {
    const s = section('## 8.', '## Références');
    const gras = [...s.matchAll(/\*\*([\d\s]+) (?:kcal|g)\*\*/g)].map((m) => nb(m[1]!));
    const r = calculerCibles({
      sexe: 'homme',
      age: 34,
      tailleCm: 180,
      poidsKg: 82.5,
      travail: 'assis',
      pas: '5000-8000',
      seances: '4',
      duree: '45-75',
      objectif: 'perte',
      rythme: 'modere',
      grossesse: null,
      maladie: 'non',
      relation: 'non',
    });
    expect([r.kcal, r.proteinG, r.fatG, r.carbsG]).toEqual(gras);
    expect(r.etapes[0]!.resultat).toBe('1 785 kcal'.replace(' ', ' '));
    expect(r.proposable).toBe(true);
  });
});
