/**
 * Le poids sur douze semaines — ce que les chiffres doivent dire, et ce qu'ils
 * ne doivent jamais inventer.
 *
 * Les quatre points demandés : la moyenne hebdomadaire, l'identité avec la
 * moyenne glissante de l'onglet Nutrition, le filtrage des périodes, et
 * l'absence d'interpolation sur un trou.
 */

import { describe, expect, it } from 'vitest';
import {
  fenetre,
  PERIODES,
  resumePoids,
  semainesDuProgramme,
  serieMoyenne,
  serieTaille,
  troncons,
} from './weightHistory';
import { weeklyAverages, weightTrend, windowAverage, type Measurement } from './nutrition';
import { addDays } from './calendar';

const DEBUT = '2026-09-14'; // un lundi : l'ancre du programme
const p = (date: string, weightKg: number | null, waistCm: number | null = null): Measurement => ({
  date,
  weightKg,
  waistCm,
});

describe('la moyenne de la semaine', () => {
  it('est celle des pesées de CETTE semaine', () => {
    const e = [p(DEBUT, 77), p(addDays(DEBUT, 2), 78), p(addDays(DEBUT, 6), 79)];
    const s = semainesDuProgramme(e, DEBUT, addDays(DEBUT, 6));
    expect(s[0]!.moyenne).toBe(78);
    expect(s[0]!.pesees).toBe(3);
  });

  /*
   * Le point que Guillaume a demandé explicitement : une semaine sans pesée
   * rend `null`, jamais 0. Un zéro se lirait comme « il ne pèse plus rien ».
   */
  it('une semaine sans pesée vaut null, jamais 0', () => {
    const e = [p(DEBUT, 77)];
    const s = semainesDuProgramme(e, DEBUT, addDays(DEBUT, 13));
    expect(s[0]!.moyenne).toBe(77);
    expect(s[1]!.moyenne).toBeNull();
    expect(s[1]!.pesees).toBe(0);
    expect(s[1]!.tourDeTaille).toBeNull();
  });

  it('les bornes de la semaine sont les bonnes, et ne se chevauchent pas', () => {
    const s = semainesDuProgramme([], DEBUT, addDays(DEBUT, 20));
    expect(s[0]).toMatchObject({ week: 0, debut: DEBUT, fin: addDays(DEBUT, 6) });
    expect(s[1]!.debut).toBe(addDays(s[0]!.fin, 1));
    expect(s[2]!.debut).toBe(addDays(s[1]!.fin, 1));
  });

  it('une pesée du dernier jour compte dans SA semaine', () => {
    // Le cas limite qui se trompe le plus facilement d'un jour.
    const e = [p(addDays(DEBUT, 6), 80), p(addDays(DEBUT, 7), 90)];
    const s = semainesDuProgramme(e, DEBUT, addDays(DEBUT, 13));
    expect(s[0]!.moyenne).toBe(80);
    expect(s[1]!.moyenne).toBe(90);
  });

  it('l’écart se mesure avec la semaine juste avant', () => {
    const e = [p(DEBUT, 77), p(addDays(DEBUT, 7), 78.5)];
    const s = semainesDuProgramme(e, DEBUT, addDays(DEBUT, 13));
    expect(s[1]!.ecart).toBe(1.5);
  });

  /*
   * Et il reste `null` quand la semaine d'avant est vide. Sauter par-dessus
   * pour comparer à la dernière semaine pesée ferait passer trois semaines
   * d'écart pour une.
   */
  it('l’écart ne saute pas par-dessus une semaine vide', () => {
    const e = [p(DEBUT, 77), p(addDays(DEBUT, 14), 79)];
    const s = semainesDuProgramme(e, DEBUT, addDays(DEBUT, 20));
    expect(s[1]!.moyenne).toBeNull();
    expect(s[2]!.ecart).toBeNull();
    expect(s[2]!.moyenne).toBe(79);
  });

  it('le tour de taille a sa propre moyenne, indépendante du poids', () => {
    const e = [p(DEBUT, 77, 84), p(addDays(DEBUT, 3), 78, null), p(addDays(DEBUT, 5), null, 86)];
    const s = semainesDuProgramme(e, DEBUT, addDays(DEBUT, 6));
    expect(s[0]!.moyenne).toBe(77.5); // deux poids
    expect(s[0]!.pesees).toBe(2);
    expect(s[0]!.tourDeTaille).toBe(85); // deux tours de taille
  });

  it('sans date de départ, pas de tableau', () => {
    expect(semainesDuProgramme([p(DEBUT, 77)], '', DEBUT)).toEqual([]);
  });

  it('ne va pas au-delà de la semaine en cours', () => {
    const s = semainesDuProgramme([], DEBUT, addDays(DEBUT, 20));
    expect(s.map((x) => x.week)).toEqual([0, 1, 2]);
  });

  it('s’arrête à la semaine 12, même bien après la fin', () => {
    const s = semainesDuProgramme([], DEBUT, addDays(DEBUT, 400));
    expect(s[s.length - 1]!.week).toBe(12);
  });
});

describe('la moyenne glissante est CELLE de l’onglet Nutrition', () => {
  const e = [
    p(DEBUT, 77),
    p(addDays(DEBUT, 1), 77.4),
    p(addDays(DEBUT, 3), 78),
    p(addDays(DEBUT, 5), 77.8),
    p(addDays(DEBUT, 8), 78.4),
  ];

  it('point par point, elle égale `windowAverage`', () => {
    const serie = serieMoyenne(e, DEBUT, addDays(DEBUT, 10));
    for (const point of serie) {
      expect(point.average, point.date).toBe(windowAverage(e, point.date, 7));
    }
  });

  it('et elle égale aussi ce qu’affiche la carte de tendance', () => {
    const jour = addDays(DEBUT, 8);
    const serie = serieMoyenne(e, DEBUT, jour);
    expect(serie[serie.length - 1]!.average).toBe(weightTrend(e, jour).average7);
  });

  it('elle recoupe `weeklyAverages`, l’autre lecture du même calcul', () => {
    const jour = addDays(DEBUT, 8);
    const hebdo = weeklyAverages(e, jour, 2);
    const serie = serieMoyenne(e, DEBUT, jour);
    const a = (d: string) => serie.find((x) => x.date === d)?.average;
    for (const point of hebdo) {
      if (a(point.endDate) === undefined) continue;
      expect(a(point.endDate), point.endDate).toBe(point.average);
    }
  });

  it('un point par JOUR, pas par pesée', () => {
    // C'est ce qui fait apparaître les trous : un point par pesée les cacherait.
    expect(serieMoyenne(e, DEBUT, addDays(DEBUT, 10))).toHaveLength(11);
  });

  it('une fenêtre à l’envers ne rend rien', () => {
    expect(serieMoyenne(e, addDays(DEBUT, 5), DEBUT)).toEqual([]);
  });
});

describe('les trous ne sont pas comblés', () => {
  /*
   * Le point le plus important du graphique : deux pesées séparées de plus de
   * sept jours ne doivent PAS être reliées. Entre les deux, la fenêtre de sept
   * jours est vide, la moyenne vaut `null`, et la ligne s'interrompt.
   */
  it('un trou de plus de 7 jours coupe la ligne', () => {
    const e = [p(DEBUT, 77), p(addDays(DEBUT, 20), 80)];
    const serie = serieMoyenne(e, DEBUT, addDays(DEBUT, 20));
    const coupures = serie.filter((x) => x.average === null);
    expect(coupures.length).toBeGreaterThan(0);
    // Et rien, jamais, entre les deux valeurs connues.
    for (const point of serie.slice(8, 14)) expect(point.average, point.date).toBeNull();
  });

  it('un trou de moins de 7 jours ne coupe pas', () => {
    // La fenêtre glissante couvre encore la pesée d'avant : c'est le contrat.
    const e = [p(DEBUT, 77), p(addDays(DEBUT, 5), 78)];
    const serie = serieMoyenne(e, DEBUT, addDays(DEBUT, 5));
    expect(serie.every((x) => x.average !== null)).toBe(true);
  });

  it('aucune valeur n’est inventée entre deux pesées', () => {
    const e = [p(DEBUT, 70), p(addDays(DEBUT, 3), 80)];
    const serie = serieMoyenne(e, DEBUT, addDays(DEBUT, 3));
    // Aucun point n'est une interpolation : chaque moyenne se déduit des
    // pesées réelles de sa fenêtre, et de rien d'autre.
    expect(serie.map((x) => x.average)).toEqual([70, 70, 70, 75]);
  });
});

describe('le sélecteur de période', () => {
  /** Le nombre de jours que le cadre couvre, bornes incluses. */
  const jours = (f: { debut: string; fin: string }) => serieMoyenne([], f.debut, f.fin).length;

  // Programme commencé il y a longtemps : les bornes ne mordent pas dessus.
  const vieux = addDays(DEBUT, 99);

  it('4 semaines rend 28 jours', () => {
    expect(jours(fenetre('4s', vieux, [], DEBUT))).toBe(28);
  });

  it('12 semaines rend 84 jours', () => {
    expect(jours(fenetre('12s', vieux, [], DEBUT))).toBe(84);
  });

  it('« Tout » ne coupe rien', () => {
    const e = Array.from({ length: 100 }, (_, i) => p(addDays(DEBUT, i), 77 + i * 0.02));
    expect(jours(fenetre('tout', vieux, e, DEBUT))).toBe(100);
  });

  /*
   * « Tout » doit inclure ce qui précède la semaine 1 : une pesée faite avant
   * le début du programme reste une mesure du même corps, et c'est souvent le
   * seul point de départ disponible.
   */
  it('« Tout » garde les pesées d’avant le programme', () => {
    const avant = [p(addDays(DEBUT, -30), 76), p(DEBUT, 77)];
    expect(fenetre('tout', vieux, avant, DEBUT).debut).toBe(addDays(DEBUT, -30));
    expect(fenetre('12s', vieux, avant, DEBUT).debut).not.toBe(addDays(DEBUT, -30));
  });

  it('les trois périodes sont bien celles du sélecteur', () => {
    expect(PERIODES.map((x) => x.cle)).toEqual(['4s', '12s', 'tout']);
  });
});

/*
 * Le défaut que ces tests auraient attrapé : pendant le premier mois, « 12
 * semaines » remontait deux mois avant le combine. La moitié gauche du
 * graphique était vide et la courbe réelle se tassait à droite.
 */
describe('aucune période bornée ne remonte avant le combine', () => {
  it('12 semaines s’arrête au combine quand le programme a un mois', () => {
    const jour = addDays(DEBUT, 30);
    expect(fenetre('12s', jour, [], DEBUT)).toEqual({ debut: DEBUT, fin: jour });
  });

  it('4 semaines aussi, quand le programme a dix jours', () => {
    const jour = addDays(DEBUT, 10);
    expect(fenetre('4s', jour, [], DEBUT)).toEqual({ debut: DEBUT, fin: jour });
  });

  it('au tout début, les deux boutons bornés montrent la même chose', () => {
    const jour = addDays(DEBUT, 3);
    expect(fenetre('4s', jour, [], DEBUT)).toEqual(fenetre('12s', jour, [], DEBUT));
  });

  it('passé douze semaines, la borne ne mord plus : 84 jours pleins', () => {
    const jour = addDays(DEBUT, 120);
    expect(fenetre('12s', jour, [], DEBUT).debut).toBe(addDays(jour, -83));
  });

  it('une pesée d’avant le combine ne tire PAS le cadre borné en arrière', () => {
    const jour = addDays(DEBUT, 20);
    const e = [p(addDays(DEBUT, -50), 75), p(DEBUT, 77)];
    expect(fenetre('12s', jour, e, DEBUT).debut).toBe(DEBUT);
  });

  it('sans date de début, la borne reste celle de la période', () => {
    const jour = addDays(DEBUT, 10);
    expect(fenetre('12s', jour, [], null).debut).toBe(addDays(jour, -83));
  });

  it('une date de début dans le futur ne retourne pas le cadre', () => {
    const jour = addDays(DEBUT, -5); // le programme n'a pas encore commencé
    const f = fenetre('4s', jour, [], DEBUT);
    expect(f.debut <= f.fin).toBe(true);
    expect(f.debut).toBe(addDays(jour, -27));
  });
});

describe('les trois chiffres de l’en-tête', () => {
  it('le départ est la moyenne du combine initial', () => {
    const e = [p(DEBUT, 77), p(addDays(DEBUT, 2), 77.4), p(addDays(DEBUT, 60), 80)];
    expect(resumePoids(e, DEBUT, addDays(DEBUT, 60)).depart).toBe(77.2);
  });

  it('l’actuel est la moyenne glissante du jour', () => {
    const e = [p(DEBUT, 77), p(addDays(DEBUT, 60), 80)];
    const jour = addDays(DEBUT, 60);
    expect(resumePoids(e, DEBUT, jour).actuel).toBe(windowAverage(e, jour, 7));
  });

  it('l’écart total est la différence des deux', () => {
    const e = [p(DEBUT, 77), p(addDays(DEBUT, 60), 80)];
    const r = resumePoids(e, DEBUT, addDays(DEBUT, 60));
    expect(r.ecartTotal).toBe(3);
  });

  it('sans pesée, les trois valent null — aucun zéro', () => {
    const r = resumePoids([], DEBUT, addDays(DEBUT, 20));
    expect(r).toEqual({ depart: null, actuel: null, ecartTotal: null });
  });

  it('un départ sans actuel ne produit pas d’écart', () => {
    // Trois semaines sans se peser : l'écart n'est pas connu, pas nul.
    const e = [p(DEBUT, 77)];
    const r = resumePoids(e, DEBUT, addDays(DEBUT, 30));
    expect(r.depart).toBe(77);
    expect(r.actuel).toBeNull();
    expect(r.ecartTotal).toBeNull();
  });
});

describe('l’axe du temps', () => {
  it('quatre semaines font vingt-huit jours, bornes incluses', () => {
    const jour = addDays(DEBUT, 40);
    const f = fenetre('4s', jour, [], DEBUT);
    expect(f.fin).toBe(jour);
    expect(serieMoyenne([], f.debut, f.fin)).toHaveLength(28);
  });

  it('douze semaines font quatre-vingt-quatre jours', () => {
    const jour = addDays(DEBUT, 90);
    const f = fenetre('12s', jour, [], DEBUT);
    expect(serieMoyenne([], f.debut, f.fin)).toHaveLength(84);
  });

  it('« Tout » remonte au début du programme même sans pesée ancienne', () => {
    const f = fenetre('tout', addDays(DEBUT, 30), [p(addDays(DEBUT, 20), 78)], DEBUT);
    expect(f.debut).toBe(DEBUT);
  });

  it('« Tout » remonte à une pesée antérieure au programme', () => {
    const avant = addDays(DEBUT, -40);
    const f = fenetre('tout', addDays(DEBUT, 10), [p(avant, 76)], DEBUT);
    expect(f.debut).toBe(avant);
  });

  it('sans date de début, « Tout » part de la première pesée', () => {
    const f = fenetre('tout', addDays(DEBUT, 10), [p(DEBUT, 77)], null);
    expect(f.debut).toBe(DEBUT);
  });

  it('sans pesée ni date de début, la fenêtre se réduit à aujourd’hui', () => {
    const jour = addDays(DEBUT, 5);
    expect(fenetre('tout', jour, [], null)).toEqual({ debut: jour, fin: jour });
  });

  it('une pesée saisie en avance étend le cadre jusqu’à elle', () => {
    const futur = addDays(DEBUT, 50);
    const f = fenetre('tout', addDays(DEBUT, 10), [p(DEBUT, 77), p(futur, 79)], DEBUT);
    expect(f.fin).toBe(futur);
  });
});

describe('les tronçons de la courbe', () => {
  it('un trou de plus de 7 jours coupe la ligne en deux tronçons', () => {
    const e = [p(DEBUT, 77), p(addDays(DEBUT, 20), 79)];
    const t = troncons(serieMoyenne(e, DEBUT, addDays(DEBUT, 20)));
    expect(t).toHaveLength(2);
    // Et rien n'est tracé entre les deux : le second tronçon commence au
    // jour de la seconde pesée, pas la veille.
    expect(t[1]![0]!.date).toBe(addDays(DEBUT, 20));
  });

  it('des pesées régulières donnent un seul tronçon continu', () => {
    const e = [0, 3, 6, 9, 12].map((d) => p(addDays(DEBUT, d), 77 + d * 0.05));
    const t = troncons(serieMoyenne(e, DEBUT, addDays(DEBUT, 12)));
    expect(t).toHaveLength(1);
    expect(t[0]).toHaveLength(13);
  });

  it('aucun tronçon ne contient de valeur nulle', () => {
    const e = [p(DEBUT, 77), p(addDays(DEBUT, 30), 79)];
    for (const tr of troncons(serieMoyenne(e, DEBUT, addDays(DEBUT, 30)))) {
      for (const point of tr) expect(point.average).not.toBeNull();
    }
  });

  it('aucune pesée du tout ne donne aucun tronçon', () => {
    expect(troncons(serieMoyenne([], DEBUT, addDays(DEBUT, 10)))).toEqual([]);
  });
});

describe('le tour de taille', () => {
  const t = (date: string, waist: number) => p(date, null, waist);

  it('ne retient que les relevés de la fenêtre', () => {
    const e = [t(addDays(DEBUT, -5), 80), t(DEBUT, 81), t(addDays(DEBUT, 5), 82)];
    const s = serieTaille(e, DEBUT, addDays(DEBUT, 5));
    expect(s.flat().map((r) => r.value)).toEqual([81, 82]);
  });

  it('ignore les lignes sans tour de taille', () => {
    const e = [p(DEBUT, 77), t(addDays(DEBUT, 3), 81)];
    expect(serieTaille(e, DEBUT, addDays(DEBUT, 7)).flat()).toHaveLength(1);
  });

  it('un trou de plus de 7 jours coupe la ligne', () => {
    const e = [t(DEBUT, 81), t(addDays(DEBUT, 20), 80)];
    expect(serieTaille(e, DEBUT, addDays(DEBUT, 20))).toHaveLength(2);
  });

  it('sept jours pile restent dans le même tronçon', () => {
    const e = [t(DEBUT, 81), t(addDays(DEBUT, 7), 80.5)];
    expect(serieTaille(e, DEBUT, addDays(DEBUT, 7))).toHaveLength(1);
  });

  it('aucun relevé ne donne aucun tronçon', () => {
    expect(serieTaille([p(DEBUT, 77)], DEBUT, addDays(DEBUT, 7))).toEqual([]);
  });
});
