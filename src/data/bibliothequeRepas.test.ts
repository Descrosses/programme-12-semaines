/*
 * La bibliothèque face au catalogue et aux photos.
 *
 * Ces tests ne vérifient pas « est-ce que la liste existe » mais les
 * décisions : chaque aliment est connu, chaque repas a sa photo, aucune
 * quantité n'est absurde, et les créneaux ne mentent pas.
 */
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BIBLIOTHEQUE_REPAS,
  alimentsNonDeclares,
  photoDe,
  repasPourCreneau,
} from './bibliothequeRepas';
import { FOOD_LIBRARY } from './foodLibrary';
import { REPAS_PERSO } from './planPerso';
import { macrosDeLigne } from '../engine/planPersoTotaux';

describe('la bibliothèque', () => {
  it('compte vingt-sept repas, un par photographie', () => {
    expect(BIBLIOTHEQUE_REPAS).toHaveLength(27);
  });

  it('aucun identifiant en double', () => {
    const ids = BIBLIOTHEQUE_REPAS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /*
   * LE TEST QUI ATTRAPE L'ERREUR LA PLUS COÛTEUSE : un aliment que le
   * catalogue ne connaît pas pèse zéro en silence. Le repas s'afficherait,
   * la ligne aussi, et le total serait faux sans que rien ne le dise.
   */
  it('chaque aliment existe au catalogue', () => {
    for (const r of BIBLIOTHEQUE_REPAS) {
      for (const ligne of r.lignes) {
        expect(FOOD_LIBRARY[ligne.foodId], `${r.id} → ${ligne.foodId}`).toBeDefined();
      }
    }
  });

  it('chaque repas a sa photo sur le disque', () => {
    const fichiers = new Set(readdirSync(new URL('../../public/repas', import.meta.url)));
    for (const r of BIBLIOTHEQUE_REPAS) {
      expect(fichiers.has(`${r.id}.webp`), `photo manquante : ${r.id}`).toBe(true);
    }
  });

  it('aucune photo orpheline', () => {
    const ids = new Set(BIBLIOTHEQUE_REPAS.map((r) => `${r.id}.webp`));
    const fichiers = readdirSync(new URL('../../public/repas', import.meta.url));
    expect(fichiers.filter((f) => !ids.has(f))).toEqual([]);
  });

  it('le chemin de la photo suit l’identifiant', () => {
    expect(photoDe('poulet-riz-brocolis')).toBe('repas/poulet-riz-brocolis.webp');
  });

  it('chaque repas a au moins un créneau, et tous existent', () => {
    const connus = new Set(REPAS_PERSO.map((r) => r.id));
    for (const r of BIBLIOTHEQUE_REPAS) {
      expect(r.creneaux.length, r.id).toBeGreaterThan(0);
      for (const c of r.creneaux) expect(connus.has(c), `${r.id} → ${c}`).toBe(true);
    }
  });

  it('chaque créneau a de quoi se remplir', () => {
    for (const r of REPAS_PERSO) {
      expect(repasPourCreneau(r.id).length, r.nom).toBeGreaterThan(0);
    }
  });
});

describe('les assiettes de référence', () => {
  /*
   * Une assiette de référence est un point de départ réaliste. Une portion
   * absurde — 800 g d'huile — ne serait pas corrigée par l'utilisateur :
   * elle lui ferait fermer l'application.
   */
  it('aucune quantité absurde', () => {
    for (const r of BIBLIOTHEQUE_REPAS) {
      for (const ligne of r.lignes) {
        const f = FOOD_LIBRARY[ligne.foodId]!;
        expect(ligne.qty, `${r.id} → ${ligne.foodId}`).not.toBeNull();
        const q = ligne.qty!;
        expect(q, `${r.id} → ${ligne.foodId}`).toBeGreaterThan(0);
        if (f.unit === 'unité') expect(q, `${r.id} → ${ligne.foodId}`).toBeLessThanOrEqual(6);
        else expect(q, `${r.id} → ${ligne.foodId}`).toBeLessThanOrEqual(400);
        /*
         * LES MATIÈRES GRASSES SE BORNENT EN CALORIES, PAS EN GRAMMES.
         *
         * La première version plafonnait la famille `gras` à 40 g, au motif
         * qu'on la compte en cuillères. C'était vrai de l'huile et du
         * beurre de cacahuète, faux de l'avocat : 80 g, c'est la moitié
         * d'un fruit, une portion parfaitement ordinaire.
         *
         * Ce qui compte vraiment est qu'aucune ligne de gras n'écrase le
         * repas. 80 g d'avocat font 128 kcal ; 80 g d'huile en font 720.
         * La borne porte donc sur ce que la ligne pèse, pas sur sa masse.
         */
        if (f.category === 'gras') {
          const kcal = macrosDeLigne(ligne, FOOD_LIBRARY).kcal;
          expect(Math.round(kcal), `${r.id} → ${ligne.foodId}`).toBeLessThanOrEqual(200);
        }
      }
    }
  });

  it('chaque repas tient dans une fourchette de calories plausible', () => {
    for (const r of BIBLIOTHEQUE_REPAS) {
      const kcal = r.lignes.reduce((a, x) => a + macrosDeLigne(x, FOOD_LIBRARY).kcal, 0);
      // Une collation descend bas, un plat monte haut — mais ni 80 ni 1 500.
      expect(Math.round(kcal), `${r.id}`).toBeGreaterThan(250);
      expect(Math.round(kcal), `${r.id}`).toBeLessThan(1200);
    }
  });

  it('chaque plat du midi ou du soir porte au moins 25 g de protéines', () => {
    for (const r of BIBLIOTHEQUE_REPAS.filter((x) => x.creneaux.includes('dejeuner'))) {
      const p = r.lignes.reduce((a, x) => a + macrosDeLigne(x, FOOD_LIBRARY).proteinG, 0);
      expect(Math.round(p), r.id).toBeGreaterThanOrEqual(25);
    }
  });
});

describe('les aliments non déclarés', () => {
  it('se signalent sans filtrer le repas', () => {
    const repas = BIBLIOTHEQUE_REPAS.find((r) => r.id === 'poulet-riz-brocolis')!;
    expect(alimentsNonDeclares(repas, ['poulet', 'riz', 'huile'])).toEqual(['brocolis']);
  });

  it('rien à signaler quand tout est déclaré', () => {
    const repas = BIBLIOTHEQUE_REPAS.find((r) => r.id === 'saumon-riz-haricots-verts')!;
    expect(alimentsNonDeclares(repas, ['saumon', 'riz', 'haricotsVerts'])).toEqual([]);
  });

  /*
   * Sans liste d'aliments, tout est permis : quelqu'un qui n'a pas répondu
   * au questionnaire ne doit pas voir dix-neuf cartes marquées « à
   * remplacer ».
   */
  it('une liste vide ne signale rien du tout', () => {
    for (const r of BIBLIOTHEQUE_REPAS) {
      expect(alimentsNonDeclares(r, []), r.id).toEqual([]);
    }
  });
});
