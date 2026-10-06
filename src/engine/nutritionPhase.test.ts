/**
 * La nutrition suit la périodisation, pas le calendrier.
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *   - une semaine de deload allège, mais ne coupe pas à proportion du volume ;
 *   - la baisse vient des glucides, jamais des protéines ni des lipides ;
 *   - la semaine 12 et les jours de combine ne sont PAS allégés ;
 *   - hors deload, rien ne change — strictement rien.
 */

import { describe, expect, it } from 'vitest';
import {
  DELOAD_QUANTITIES,
  NUTRITION_TARGETS,
  type NutritionTarget,
} from '../data/nutrition';
import { WEEK_BLOCKS } from '../data/program';
import {
  mealMacros,
  mealsGap,
  mealsTotal,
  phaseForDay,
  targetForPhase,
} from './nutrition';
import type { DayIndex, WeekIndex } from '../data/types';

const TRAIN = NUTRITION_TARGETS.train;
const REST = NUTRITION_TARGETS.rest;
const DELOAD = targetForPhase(TRAIN, 'deloadLight');

const LUNDI = 0 as DayIndex;
const SAMEDI = 5 as DayIndex;
const DIMANCHE = 6 as DayIndex;

describe('quelle phase, quel jour', () => {
  it('une semaine d’accumulation ou de force ne change rien', () => {
    for (const w of [1, 2, 3, 5, 6, 7, 9, 10, 11] as WeekIndex[]) {
      expect(phaseForDay(w, LUNDI), `semaine ${w}`).toBe('normal');
    }
  });

  it('les semaines 4 et 8 allègent les journées d’entraînement', () => {
    expect(phaseForDay(4 as WeekIndex, LUNDI)).toBe('deloadLight');
    expect(phaseForDay(8 as WeekIndex, LUNDI)).toBe('deloadLight');
  });

  /*
   * Le samedi et le dimanche de la semaine 8 portent le combine intermédiaire.
   * Une journée où l'on cherche une performance se mange comme une journée
   * d'entraînement normale, même en semaine allégée.
   */
  it('les jours de combine de la semaine 8 restent en journée normale', () => {
    expect(phaseForDay(8 as WeekIndex, SAMEDI)).toBe('normal');
    expect(phaseForDay(8 as WeekIndex, DIMANCHE)).toBe('normal');
    // Mais le reste de la semaine 8 est bien allégé.
    expect(phaseForDay(8 as WeekIndex, LUNDI)).toBe('deloadLight');
  });

  /*
   * Le point qui ne doit jamais régresser : la semaine 12 baisse en volume mais
   * se termine par des tests. La règle le donne toute seule — son bloc est
   * `taper`, pas `deload` — sans qu'un cas particulier soit écrit.
   */
  it('la semaine 12 n’est jamais allégée, aucun jour', () => {
    for (const d of [0, 2, 4, 5, 6] as DayIndex[]) {
      expect(phaseForDay(12 as WeekIndex, d), `jour ${d}`).toBe('normal');
    }
    expect(WEEK_BLOCKS[12]).toBe('taper');
  });

  it('hors programme, rien ne s’applique', () => {
    expect(phaseForDay(null, LUNDI)).toBe('normal');
  });

  it('seules les semaines marquées deload allègent', () => {
    for (let w = 0; w <= 12; w++) {
      const attendu = WEEK_BLOCKS[w as WeekIndex] === 'deload' ? 'deloadLight' : 'normal';
      expect(phaseForDay(w as WeekIndex, LUNDI), `semaine ${w}`).toBe(attendu);
    }
  });
});

describe('les jours sans séance d’une semaine de deload', () => {
  /*
   * Changement par rapport à la première version : le jour de repos d'une
   * semaine de deload baisse LUI AUSSI, simplement deux fois moins. Il part
   * déjà 424 kcal plus bas qu'un jour d'entraînement ; y empiler une grosse
   * coupe ferait d'une semaine de récupération la plus restrictive de tout le
   * programme.
   */
  it('ils sont concernés, eux aussi', () => {
    expect(phaseForDay(4 as WeekIndex, null)).toBe('deloadLight');
    expect(phaseForDay(8 as WeekIndex, null)).toBe('deloadLight');
    expect(phaseForDay(1 as WeekIndex, null)).toBe('normal');
    expect(phaseForDay(12 as WeekIndex, null)).toBe('normal');
    expect(phaseForDay(null, null)).toBe('normal');
  });

  it('le palier repos baisse, mais deux fois moins que l’entraînement', () => {
    const reposAllege = targetForPhase(REST, 'deloadLight');
    const baisseRepos = REST.kcal - reposAllege.kcal;
    const baisseTrain = TRAIN.kcal - DELOAD.kcal;

    expect(baisseRepos).toBeGreaterThan(0);
    expect(baisseRepos).toBeLessThan(baisseTrain / 1.5);
    // Et il reste un jour de repos : rien d'autre que des féculents n'a bougé.
    expect(REST.fatG - reposAllege.fatG).toBeLessThanOrEqual(1);
    expect(REST.proteinG - reposAllege.proteinG).toBeLessThanOrEqual(4);
  });
});

describe('ce que la phase change dans l’assiette', () => {
  it('hors deload, c’est le même objet, à l’identique', () => {
    expect(targetForPhase(TRAIN, 'normal')).toBe(TRAIN);
    expect(targetForPhase(REST, 'normal')).toBe(REST);
  });

  /*
   * La règle la plus importante, et la moins intuitive : −40 % de volume
   * d'entraînement ne veut PAS dire −40 % de calories. Une semaine de deload
   * est aussi une semaine de récupération.
   */
  it('la baisse reste entre 150 et 300 kcal', () => {
    const ecart = TRAIN.kcal - DELOAD.kcal;
    expect(ecart).toBeGreaterThanOrEqual(150);
    expect(ecart).toBeLessThanOrEqual(300);
    // Et très loin d'une coupe proportionnelle au volume.
    expect(ecart / TRAIN.kcal).toBeLessThan(0.1);
  });

  it('les protéines ne bougent pas', () => {
    expect(TRAIN.proteinG - DELOAD.proteinG).toBeLessThanOrEqual(6);
  });

  it('les lipides ne bougent pas non plus', () => {
    expect(TRAIN.fatG - DELOAD.fatG).toBeLessThanOrEqual(3);
  });

  /*
   * On compare les baisses RELATIVES, et non des kcal : les totaux du plan sont
   * des valeurs d'étiquette, pas la somme 4/4/9 des macros (le .md l'assume, et
   * l'en-tête de `nutrition.ts` l'explique). Rapporter des grammes de glucides
   * à des kcal d'étiquette mélangerait deux unités et donnerait un chiffre qui
   * ne veut rien dire.
   *
   * Ce que la règle demande, elle, se lit directement : les glucides perdent
   * 10 % de leur apport, les protéines 2,6 %, les lipides rien.
   */
  it('la baisse vient des glucides, et presque d’eux seuls', () => {
    const part = (a: number, b: number) => (a - b) / a;
    const glucides = part(TRAIN.carbsG, DELOAD.carbsG);
    const proteines = part(TRAIN.proteinG, DELOAD.proteinG);
    const lipides = part(TRAIN.fatG, DELOAD.fatG);

    expect(glucides).toBeGreaterThan(0.08);
    // Les glucides baissent au moins deux fois plus, en proportion.
    expect(proteines * 2).toBeLessThan(glucides);
    /* Le pain porte 3,3 g de lipides pour 100 g : en retirer 25 g en enlève
       0,8 g. C'est tout ce que les lipides perdent — 2 g sur 91 — et les
       glucides baissent quatre fois plus, en proportion. */
    expect(lipides).toBeLessThan(0.03);
    expect(lipides * 4).toBeLessThan(glucides);
  });

  it('seuls des féculents sont allégés, sur les deux paliers', () => {
    const toutes = [...lignes(TRAIN), ...lignes(REST)];
    for (const id of Object.keys(DELOAD_QUANTITIES)) {
      const ligne = toutes.find((i) => i.id === id);
      expect(ligne, id).toBeDefined();
      expect(ligne!.category, id).toBe('feculent');
    }
  });

  it('une quantité allégée est toujours plus petite', () => {
    const toutes = [...lignes(TRAIN), ...lignes(REST)];
    for (const [id, qty] of Object.entries(DELOAD_QUANTITIES)) {
      expect(qty, id).toBeLessThan(toutes.find((i) => i.id === id)!.qty);
    }
  });

  it('les lignes allégées se signalent, les autres non', () => {
    const marquees = [
      ...lignes(DELOAD).filter((i) => i.adjusted === 'deloadLight'),
      ...lignes(targetForPhase(REST, 'deloadLight')).filter((i) => i.adjusted === 'deloadLight'),
    ];
    expect(marquees.map((i) => i.id).sort()).toEqual(Object.keys(DELOAD_QUANTITIES).sort());
    expect(lignes(TRAIN).some((i) => i.adjusted)).toBe(false);
    expect(lignes(REST).some((i) => i.adjusted)).toBe(false);
  });

  it('aucun aliment n’est ajouté ni retiré', () => {
    expect(lignes(DELOAD).map((i) => i.id)).toEqual(lignes(TRAIN).map((i) => i.id));
    expect(DELOAD.meals.map((m) => m.name)).toEqual(TRAIN.meals.map((m) => m.name));
  });

  /*
   * Chaque palier ne baisse QUE de ce qui le concerne : les identifiants de
   * ligne sont distincts (`t.` et `r.`), donc alléger le riz du jour
   * d'entraînement ne touche pas celui du jour de repos.
   */
  it('chaque palier ne bouge que sur ses propres lignes', () => {
    expect(lignes(DELOAD).find((i) => i.id === 't.dejeuner.riz')!.qty).toBe(200);
    const repos = targetForPhase(REST, 'deloadLight');
    expect(lignes(repos).find((i) => i.id === 'r.dejeuner.riz')!.qty).toBe(150);
    // La collation de 8 h est partagée : elle n'est allégée nulle part.
    expect(lignes(DELOAD).find((i) => i.id === 'x.collation8.confiture')!.adjusted).toBeUndefined();
  });
});

describe('les totaux se recalculent, et la cible avec eux', () => {
  /*
   * Le piège qu'il fallait éviter : alléger les repas sans recalculer la cible
   * aurait fait annoncer « déficit de 200 kcal » chaque jour de deload — une
   * alerte sur un plan qui fait exactement ce qu'on lui demande.
   */
  it('la cible allégée EST le total de ses repas', () => {
    const t = mealsTotal(DELOAD);
    expect(t.kcal).toBe(DELOAD.kcal);
    expect(t.proteinG).toBe(DELOAD.proteinG);
    expect(t.carbsG).toBe(DELOAD.carbsG);
    expect(t.fatG).toBe(DELOAD.fatG);
  });

  it('aucun écart signalé, donc aucune alerte', () => {
    expect(mealsGap(DELOAD).kcal).toBe(0);
  });

  it('chaque repas annonce le total de ses propres aliments', () => {
    for (const m of DELOAD.meals) {
      const calc = mealMacros(m);
      expect(calc.kcal, m.name).toBe(m.kcal);
      expect(calc.proteinG, m.name).toBe(m.proteinG);
    }
  });

  /* Le plan d'origine n'est jamais réécrit : c'est ce qui rend le retour en
     arrière possible, et ce qui empêche le plan et sa source de diverger. */
  it('le palier d’origine est intact', () => {
    expect(TRAIN.kcal).toBe(3226);
    expect(lignes(TRAIN).find((i) => i.id === 't.dejeuner.riz')!.qty).toBe(250);
  });

  it('une correction de Guillaume prime sur l’ajustement', () => {
    // L'appli propose, il tranche : sa quantité gagne, par le chemin habituel.
    const avec = mealsTotal(DELOAD, { 't.dejeuner.riz': { qty: 400 } });
    expect(avec.kcal).toBeGreaterThan(DELOAD.kcal);
  });
});

function lignes(t: NutritionTarget) {
  return t.meals.flatMap((m) => m.items ?? []);
}
