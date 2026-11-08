/*
 * La fiche voyage dans un message, pas dans un tuyau propre. Ces tests
 * fixent ce qu'elle doit supporter : un bonjour avant, une signature après,
 * des retours à la ligne au milieu, et des identifiants venus de deux
 * catalogues différents.
 *
 * Et surtout ce qu'elle ne doit JAMAIS faire : deviner. Un aliment inconnu
 * se signale, une valeur absurde se refuse, une journée manquante se dit.
 */
import { describe, expect, it } from 'vitest';
import { genererFiche, lireFiche, patchDeFiche, MARQUEUR } from './fiche';
import type { CiblesNutrition } from '../data/ciblesNutrition';

const CIBLES: CiblesNutrition = {
  train: { kcal: 2400, proteinG: 150, carbsG: 260, fatG: 80 },
  rest: { kcal: 2100, proteinG: 150, carbsG: 200, fatG: 70 },
};

describe('aller-retour', () => {
  it('ce qui est écrit se relit à l’identique', () => {
    const texte = genererFiche({ cibles: CIBLES, aliments: ['riz', 'poulet', 'amandes'] });
    const lu = lireFiche(texte);
    expect(lu.cibles).toEqual(CIBLES);
    expect(lu.aliments).toEqual(['riz', 'poulet', 'amandes']);
    expect(lu.problemes).toEqual([]);
    expect(lu.inconnus).toEqual([]);
  });

  it('tient sur une ligne, et reste lisible à l’œil', () => {
    const texte = genererFiche({ cibles: CIBLES, aliments: ['riz'] });
    expect(texte).toBe('MAJK1 C=2400,150,260,80 R=2100,150,200,70 A=riz');
    expect(texte).not.toContain('\n');
  });

  it('n’écrit pas une journée incomplète', () => {
    // Écrire « 2400,150,, » obligerait le lecteur à deviner.
    const texte = genererFiche({
      cibles: {
        train: CIBLES.train,
        rest: { kcal: 2100, proteinG: null, carbsG: null, fatG: null },
      },
      aliments: [],
    });
    expect(texte).toBe('MAJK1 C=2400,150,260,80');
  });

  it('accepte une fiche d’aliments seuls, sans cibles', () => {
    const texte = genererFiche({ cibles: null, aliments: ['riz', 'kiwi'] });
    expect(texte).toBe('MAJK1 A=riz,kiwi');
    expect(lireFiche(texte).aliments).toEqual(['riz', 'kiwi']);
  });
});

describe('collée au milieu d’un message', () => {
  it('se trouve entre un bonjour et une signature', () => {
    const message = [
      'Salut Marie 👋',
      'Voilà tes cibles, colle tout ça dans MAJK :',
      genererFiche({ cibles: CIBLES, aliments: ['riz'] }),
      'À lundi !',
    ].join('\n');
    const lu = lireFiche(message);
    expect(lu.trouvee).toBe(true);
    expect(lu.cibles).toEqual(CIBLES);
    expect(lu.aliments).toEqual(['riz']);
  });

  it('s’arrête au premier mot qui n’est pas une partie de fiche', () => {
    const lu = lireFiche(`${MARQUEUR} C=2400,150,260,80 bonne séance !`);
    expect(lu.cibles).toBeNull(); // il manque le jour de repos
    expect(lu.problemes.join(' ')).toContain('seule journée');
  });

  it('dit que ce n’est pas une fiche quand le marqueur manque', () => {
    const lu = lireFiche('Salut, tes cibles sont 2400 kcal et 150 g de protéines');
    expect(lu.trouvee).toBe(false);
    expect(lu.cibles).toBeNull();
  });
});

describe('les deux dialectes d’identifiants', () => {
  it('accepte ceux de MAJK', () => {
    expect(lireFiche('MAJK1 A=pommesDeTerre,haricotsVerts').aliments).toEqual([
      'pommesDeTerre',
      'haricotsVerts',
    ]);
  });

  it('accepte ceux du questionnaire, et les traduit', () => {
    expect(lireFiche('MAJK1 A=pomme-de-terre,haricots-verts').aliments).toEqual([
      'pommesDeTerre',
      'haricotsVerts',
    ]);
  });

  it('mélange les deux sans broncher', () => {
    expect(lireFiche('MAJK1 A=pomme-de-terre,haricotsVerts,flocons').aliments).toEqual([
      'pommesDeTerre',
      'haricotsVerts',
      'avoine',
    ]);
  });

  it('ne compte pas deux fois le même aliment écrit de deux façons', () => {
    expect(lireFiche('MAJK1 A=pomme-de-terre,pommesDeTerre').aliments).toEqual(['pommesDeTerre']);
  });
});

describe('ce qu’elle refuse de deviner', () => {
  it('signale un aliment inconnu au lieu du plus ressemblant', () => {
    const lu = lireFiche('MAJK1 A=riz,tofu-fume,kiwi');
    expect(lu.aliments).toEqual(['riz', 'kiwi']);
    expect(lu.inconnus).toEqual(['tofu-fume']);
  });

  it('refuse des valeurs hors bornes plutôt que de les poser', () => {
    const lu = lireFiche('MAJK1 C=24000,150,260,80 R=2100,150,200,70');
    expect(lu.cibles).toBeNull();
    expect(lu.problemes.join(' ')).toContain('bornes');
  });

  it('refuse un nombre de valeurs qui ne tombe pas juste', () => {
    const lu = lireFiche('MAJK1 C=2400,150,260 R=2100,150,200,70');
    expect(lu.cibles).toBeNull();
    expect(lu.problemes.join(' ')).toContain('quatre nombres');
  });

  it('refuse du texte à la place d’un nombre', () => {
    const lu = lireFiche('MAJK1 C=beaucoup,150,260,80 R=2100,150,200,70');
    expect(lu.cibles).toBeNull();
    expect(lu.problemes).not.toEqual([]);
  });

  it('signale une partie qu’elle ne connaît pas, sans s’arrêter', () => {
    const lu = lireFiche('MAJK1 C=2400,150,260,80 X=42 R=2100,150,200,70');
    expect(lu.cibles).toEqual(CIBLES);
    expect(lu.problemes.join(' ')).toContain('inconnue');
  });
});

describe('appliquer une fiche', () => {
  const lu = (texte: string) => patchDeFiche(lireFiche(texte));

  /*
   * LE TEST QUI JUSTIFIE LA RÈGLE.
   *
   * Sans le masquage, appliquer une fiche n'avait aucun effet visible :
   * `cibleDuJour` tranche en faveur des menus quand ils sont affichés, donc
   * l'onglet Nutrition continuait d'annoncer la somme du plan au-dessus de
   * cibles qu'on venait de poser. Trois allers-retours pour s'en apercevoir.
   */
  it('masque le plan historique : sinon les cibles posées restent invisibles', () => {
    const p = lu('MAJK1 C=2800,160,360,80 R=2500,160,285,80');
    expect(p.legacyNutritionPlan).toBe(false);
    expect(p.ciblesNutrition?.train.kcal).toBe(2800);
  });

  it('une fiche qui ne porte que des aliments ne masque rien', () => {
    // Elle ne dit rien des calories : elle n'a pas à décider de ce qui les
    // affiche.
    const p = lu('MAJK1 A=poulet,riz');
    expect(p.legacyNutritionPlan).toBeUndefined();
    expect(p.alimentsPreferes).toEqual(['poulet', 'riz']);
    expect(p.ciblesNutrition).toBeUndefined();
  });

  it('une fiche illisible n’écrit rien du tout', () => {
    expect(lu('Bonjour, ça va ?')).toEqual({});
  });

  it('les deux à la fois s’écrivent ensemble', () => {
    const p = lu('MAJK1 C=2800,160,360,80 R=2500,160,285,80 A=poulet,riz');
    expect(Object.keys(p).sort()).toEqual([
      'alimentsPreferes',
      'ciblesNutrition',
      'legacyNutritionPlan',
    ]);
  });
});
