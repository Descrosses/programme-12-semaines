import { describe, expect, it } from 'vitest';
import {
  addDays,
  currentWeek,
  dateFor,
  daysBetween,
  humanDate,
  humanDateShort,
  isMonday,
  locateToday,
  nearestMonday,
  nextSession,
  previousSession,
  prochaineSeance,
  schedule,
} from './calendar';

/** Lundi 5 janvier 2026 — lundi du combine initial, l'ancre du calendrier. */
const START = '2026-01-05';

describe('calendrier — le calage décidé avec Guillaume', () => {
  it('le combine initial occupe lundi, mardi, jeudi, vendredi et samedi', () => {
    expect(dateFor(START, 0, 0)).toBe('2026-01-05'); // lundi   — squat
    expect(dateFor(START, 0, 1)).toBe('2026-01-06'); // mardi   — tractions lestées
    expect(dateFor(START, 0, 3)).toBe('2026-01-08'); // jeudi   — deadlift
    expect(dateFor(START, 0, 4)).toBe('2026-01-09'); // vendredi — bench
    expect(dateFor(START, 0, 5)).toBe('2026-01-10'); // samedi  — tractions max
  });

  it('le mercredi et le dimanche de la semaine 0 restent vides', () => {
    const s0 = schedule(START).filter((s) => s.week === 0);
    expect(s0.map((s) => s.day)).toEqual([0, 1, 3, 4, 5]);
    expect(s0).toHaveLength(5);
  });

  it('la semaine 1 démarre le lundi suivant, semaine pleine', () => {
    expect(dateFor(START, 1, 0)).toBe('2026-01-12'); // lundi
    expect(dateFor(START, 1, 2)).toBe('2026-01-14'); // mercredi
    expect(dateFor(START, 1, 4)).toBe('2026-01-16'); // vendredi
    expect(dateFor(START, 1, 5)).toBe('2026-01-17'); // samedi
    expect(dateFor(START, 1, 6)).toBe('2026-01-18'); // dimanche
    expect(schedule(START).filter((s) => s.week === 1)).toHaveLength(5);
  });

  it('un jour de repos complet sépare le combine de la semaine 1', () => {
    const dernierTest = dateFor(START, 0, 5); // samedi
    const premiereSeance = dateFor(START, 1, 0); // lundi
    expect(daysBetween(dernierTest, premiereSeance)).toBe(2);
  });

  it('le deadlift a un jour vide la veille', () => {
    const dates = new Set(schedule(START).map((s) => s.date));
    const deadlift = dateFor(START, 0, 3);
    expect(dates.has(addDays(deadlift, -1))).toBe(false); // mercredi
  });

  it('la semaine 2 reprend le rythme régulier', () => {
    expect(dateFor(START, 2, 0)).toBe('2026-01-19'); // lundi
    expect(dateFor(START, 2, 6)).toBe('2026-01-25'); // dimanche
  });

  it('chaque séance tombe le bon jour de la semaine', () => {
    const isoDay = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const attendu = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    for (const s of schedule(START)) {
      const jour = isoDay[new Date(`${s.date}T12:00:00Z`).getUTCDay()];
      expect(jour, `S${s.week} ${s.label} (${s.date})`).toBe(attendu[s.day]);
    }
  });

  it('le programme compte 65 séances : 5 du combine + 12 × 5', () => {
    const all = schedule(START);
    expect(all).toHaveLength(5 + 12 * 5);
    expect(all[0]!.date).toBe('2026-01-05');
    expect(all[all.length - 1]!.week).toBe(12);
    expect(all[all.length - 1]!.day).toBe(6);
  });

  it('les séances sont strictement croissantes dans le temps', () => {
    const all = schedule(START);
    for (let i = 1; i < all.length; i++) {
      expect(all[i]!.date > all[i - 1]!.date, `${all[i - 1]!.date} → ${all[i]!.date}`).toBe(true);
    }
  });

  it('à partir de la semaine 1, mardi et jeudi sont toujours des repos', () => {
    const dates = new Set(
      schedule(START)
        .filter((s) => s.week >= 1)
        .map((s) => s.date),
    );
    for (let d = 7; d < 90; d++) {
      const iso = addDays(START, d);
      const jour = new Date(`${iso}T12:00:00Z`).getUTCDay();
      if (jour === 2 || jour === 4) expect(dates.has(iso), iso).toBe(false);
    }
  });
});

describe('écran Aujourd’hui', () => {
  it('reconnaît un jour de séance', () => {
    const t = locateToday(START, '2026-01-12')!; // lundi S1
    expect(t.kind).toBe('session');
    if (t.kind === 'session') {
      expect(t.session.week).toBe(1);
      expect(t.session.day).toBe(0);
    }
  });

  it('un mardi de semaine d’entraînement annonce le mercredi', () => {
    const t = locateToday(START, '2026-01-13')!; // mardi S1
    expect(t.kind).toBe('rest');
    if (t.kind === 'rest') {
      expect(t.next.date).toBe('2026-01-14');
      expect(t.next.week).toBe(1);
      expect(t.daysUntil).toBe(1);
    }
  });

  it('le mercredi de repos du combine annonce le deadlift du jeudi', () => {
    const t = locateToday(START, '2026-01-07')!;
    expect(t.kind).toBe('rest');
    if (t.kind === 'rest') {
      expect(t.next.day).toBe(3);
      expect(t.next.week).toBe(0);
      expect(t.daysUntil).toBe(1);
    }
  });

  it('le dimanche de repos annonce le premier lundi de la semaine 1', () => {
    const t = locateToday(START, '2026-01-11')!;
    expect(t.kind).toBe('rest');
    if (t.kind === 'rest') {
      expect(t.next.week).toBe(1);
      expect(t.next.label).toBe('Lundi');
    }
  });

  it('avant le début, annonce le premier jour', () => {
    const t = locateToday(START, '2025-12-30')!;
    expect(t.kind).toBe('before');
    if (t.kind === 'before') expect(t.daysUntil).toBe(6);
  });

  it('après la fin, annonce que c’est terminé', () => {
    const t = locateToday(START, '2026-06-01')!;
    expect(t.kind).toBe('finished');
  });

  it('sans date de début, rien à afficher', () => {
    expect(locateToday('', '2026-01-12')).toBeNull();
  });
});

describe('navigation manuelle', () => {
  it('recule et avance d’une séance', () => {
    // Avant le lundi de la S1 : le samedi du combine, en semaine 0.
    expect(previousSession(START, 1, 0)!.week).toBe(0);
    expect(previousSession(START, 1, 0)!.day).toBe(5);
    expect(nextSession(START, 1, 0)!.day).toBe(2); // mercredi
    expect(previousSession(START, 0, 0)).toBeNull(); // première séance
    expect(nextSession(START, 12, 6)).toBeNull(); // dernière
  });
});

describe('utilitaires de date', () => {
  it('compte les jours sans se faire piéger par l’heure d’été', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // passage à l’heure d’été
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('écrit les dates en français', () => {
    expect(humanDate('2026-01-03')).toBe('samedi 3 janvier');
    expect(humanDate('2026-08-17')).toBe('lundi 17 août');
  });
});

/*
 * Le bug remonté par Guillaume : une séance datée depuis le jour de
 * consultation au lieu de l'ancre fixe. Ces tests verrouillent l'inverse.
 */
describe('l’ancre de date ne bouge jamais avec le jour de consultation', () => {
  it('les dates du combine sont identiques quel que soit « aujourd’hui »', () => {
    const ancre = '2026-09-14'; // lundi
    const attendu = ['2026-09-14', '2026-09-15', '2026-09-17', '2026-09-18', '2026-09-19'];

    for (const aujourdhui of ['2026-09-14', '2026-09-19', '2026-11-30']) {
      const vu = schedule(ancre)
        .filter((s) => s.week === 0)
        .map((s) => s.date);
      expect(vu, `consulté le ${aujourdhui}`).toEqual(attendu);
      // `locateToday` lit la date du jour, mais ne la laisse pas déplacer les séances.
      const etat = locateToday(ancre, aujourdhui)!;
      const cible =
        etat.kind === 'session' ? etat.session : etat.kind === 'rest' ? etat.next : null;
      if (cible) expect(cible.date).toBe(dateFor(ancre, cible.week, cible.day));
    }
  });

  it('chaque jour du combine reste calé sur l’ancre, pas sur la date d’ouverture', () => {
    const ancre = '2026-09-14';
    expect(dateFor(ancre, 0, 1)).toBe('2026-09-15'); // tractions lestées
    expect(dateFor(ancre, 0, 3)).toBe('2026-09-17'); // deadlift
    expect(dateFor(ancre, 0, 5)).toBe('2026-09-19'); // tractions max
    expect(dateFor(ancre, 1, 0)).toBe('2026-09-21'); // début semaine 1
    expect(dateFor(ancre, 12, 6)).toBe('2026-12-13'); // dernière séance
  });

  it('corriger l’ancre décale tout le calendrier d’un bloc', () => {
    const avant = schedule('2026-09-14');
    const apres = schedule('2026-09-21');
    expect(apres).toHaveLength(avant.length);
    for (let i = 0; i < avant.length; i++) {
      expect(daysBetween(avant[i]!.date, apres[i]!.date)).toBe(7);
    }
  });

  it('reconnaît une ancre qui n’est pas un lundi et propose le bon lundi', () => {
    expect(isMonday('2026-09-14')).toBe(true);
    expect(isMonday('2026-09-12')).toBe(false); // le samedi de l'ancienne version
    expect(nearestMonday('2026-09-12')).toBe('2026-09-14'); // samedi → lundi suivant
    expect(nearestMonday('2026-09-15')).toBe('2026-09-14'); // mardi → la veille
    expect(nearestMonday('2026-09-18')).toBe('2026-09-21'); // vendredi → lundi suivant
    expect(nearestMonday('2026-09-14')).toBe('2026-09-14');
  });
});

describe('semaine en cours', () => {
  it('reste sur la semaine de la dernière séance passée', () => {
    expect(currentWeek(START, '2026-01-05')).toBe(0); // lundi du combine
    expect(currentWeek(START, '2026-01-11')).toBe(0); // dimanche de repos
    expect(currentWeek(START, '2026-01-12')).toBe(1); // lundi, début S1
    expect(currentWeek(START, '2026-01-19')).toBe(2); // lundi S2
  });

  it('avant le début, annonce déjà la semaine 0', () => {
    expect(currentWeek(START, '2025-12-20')).toBe(0);
  });

  it('après la fin, reste sur la dernière semaine', () => {
    expect(currentWeek(START, '2026-12-31')).toBe(12);
  });

  it('sans ancre, ne devine rien', () => {
    expect(currentWeek('', '2026-01-12')).toBeNull();
  });
});

describe('humanDateShort', () => {
  it('donne la date sans son jour de la semaine', () => {
    expect(humanDateShort('2026-10-19')).toBe('19 octobre');
    expect(humanDateShort('2026-11-02')).toBe('2 novembre');
  });

  it('couvre les mois accentués', () => {
    expect(humanDateShort('2026-02-14')).toBe('14 février');
    expect(humanDateShort('2026-08-03')).toBe('3 août');
    expect(humanDateShort('2026-12-25')).toBe('25 décembre');
  });

  it('dit la même chose que `humanDate`, le jour en moins', () => {
    // Le garde-fou qui compte : les deux doivent rester d'accord sur la date.
    for (const iso of ['2026-01-01', '2026-06-30', '2026-10-19']) {
      expect(humanDate(iso)).toContain(humanDateShort(iso));
    }
  });
});

describe('un autre programme, une autre structure', () => {
  /*
   * La preuve que la couture sert à quelque chose.
   *
   * Une structure de quatre semaines, quatre séances par semaine, sans
   * semaine 0 — c'est exactement la forme de MASS 4. Le calendrier doit la
   * poser sans rien savoir d'elle, et surtout sans retomber sur les treize
   * semaines de POWER 12.
   */
  const MASS_LIKE = {
    semaines: [1, 2, 3, 4],
    joursDeLaSemaine: (w: number) => (w >= 1 && w <= 4 ? ([0, 1, 3, 5] as const) : ([] as const)),
  };

  it('pose quatre semaines de quatre séances, et pas treize', () => {
    const toutes = schedule('2026-11-02', MASS_LIKE);
    expect(toutes).toHaveLength(16);
    expect(new Set(toutes.map((s) => s.week))).toEqual(new Set([1, 2, 3, 4]));
  });

  it('ne commence pas par une semaine 0 quand le programme n’en a pas', () => {
    const toutes = schedule('2026-11-02', MASS_LIKE);
    expect(toutes[0]?.week).toBe(1);
  });

  it('fait tomber la première séance SUR la date de début', () => {
    /*
     * Ce test a été écrit après coup, et l'assertion qu'il remplace disait le
     * contraire : elle attendait le 9 novembre pour une date de début au 2.
     *
     * Elle décrivait le code plutôt que l'intention. `offsetFor` valait
     * `week * 7`, ce qui prend la date de début pour le lundi de la SEMAINE 0 ;
     * un programme qui commence en semaine 1 démarrait donc une semaine après
     * la date choisie. L'écran des réglages l'affichait noir sur blanc —
     * « lundi de la semaine 1 : 12 octobre », puis « Semaine 1 le lundi
     * 19 octobre » — et personne ne pouvait caler son cycle correctement.
     *
     * Pour POWER 12 rien ne change : sa première semaine EST la semaine 0,
     * son combine tombe bien le lundi choisi, et l'empreinte le vérifie.
     */
    expect(schedule('2026-11-02', MASS_LIKE)[0]?.date).toBe('2026-11-02');
    expect(dateFor('2026-11-02', 1, 0, MASS_LIKE)).toBe('2026-11-02');
    // La quatrième et dernière semaine tombe trois semaines plus tard.
    expect(dateFor('2026-11-02', 4, 5, MASS_LIKE)).toBe('2026-11-28');
    // POWER 12, lui, garde son combine le jour même et sa semaine 1 au lundi
    // suivant.
    expect(dateFor('2026-11-02', 0, 0)).toBe('2026-11-02');
    expect(dateFor('2026-11-02', 1, 0)).toBe('2026-11-09');
  });

  it('situe aujourd’hui dans CE programme, pas dans l’autre', () => {
    const etat = locateToday('2026-11-02', '2026-11-09', MASS_LIKE);
    expect(etat?.kind).toBe('session');
    const dernier = schedule('2026-11-02', MASS_LIKE).at(-1);
    expect(locateToday('2026-11-02', '2027-01-01', MASS_LIKE)).toEqual({
      kind: 'finished',
      last: dernier,
    });
  });
});

/*
 * « Ouvrir la prochaine séance » pointait une séance déjà faite.
 *
 * Le cas réel : la séance du vendredi terminée le jeudi soir. Le vendredi,
 * l'accueil proposait toujours de l'ouvrir, et ne basculait jamais sur la
 * suivante. Ces tests tiennent la règle qui corrige ça.
 */
describe('prochaineSeance', () => {
  const PLAN = schedule('2026-11-02').slice(0, 6);
  const aucune = () => false;

  it('rend la séance du jour quand elle n’est pas faite', () => {
    const cible = PLAN[2]!;
    expect(prochaineSeance(PLAN, cible.date, aucune)).toEqual(cible);
  });

  it('saute la séance du jour quand elle est DÉJÀ terminée', () => {
    const faite = PLAN[2]!;
    const suivante = PLAN[3]!;
    const resultat = prochaineSeance(PLAN, faite.date, (s) => s.date === faite.date);
    expect(resultat).toEqual(suivante);
  });

  it('saute plusieurs séances faites d’avance, pas seulement une', () => {
    const faites = new Set([PLAN[0]!.date, PLAN[1]!.date, PLAN[2]!.date]);
    const resultat = prochaineSeance(PLAN, PLAN[0]!.date, (s) => faites.has(s.date));
    expect(resultat).toEqual(PLAN[3]);
  });

  it('rend null quand tout ce qui reste est fait', () => {
    expect(prochaineSeance(PLAN, PLAN[0]!.date, () => true)).toBeNull();
  });

  it('un jour de repos pointe la séance suivante', () => {
    // Une date postérieure à la 1re séance et antérieure à la 2e.
    const veille = PLAN[1]!.date;
    expect(prochaineSeance(PLAN, veille, aucune)).toEqual(PLAN[1]);
  });

  it('ne revient PAS sur une séance manquée dans le passé', () => {
    // La première n'a pas été faite, mais on est déjà au jour de la troisième.
    const resultat = prochaineSeance(PLAN, PLAN[2]!.date, aucune);
    expect(resultat).toEqual(PLAN[2]);
  });

  it('rouvre une séance commencée mais non terminée', () => {
    // « Commencée » n'est pas « faite » : c'est justement celle qu'on veut.
    const cible = PLAN[1]!;
    expect(prochaineSeance(PLAN, cible.date, () => false)).toEqual(cible);
  });
});
