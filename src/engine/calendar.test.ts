import { describe, expect, it } from 'vitest';
import {
  addDays,
  currentWeek,
  dateFor,
  daysBetween,
  humanDate,
  isSaturday,
  locateToday,
  nearestSaturday,
  nextSession,
  previousSession,
  schedule,
} from './calendar';

/** Samedi 3 janvier 2026 — samedi du combine initial. */
const START = '2026-01-03';

describe('calendrier — le calage décidé avec Guillaume', () => {
  it('le combine initial occupe samedi, dimanche, puis le lundi — tous en semaine 0', () => {
    expect(dateFor(START, 0, 3)).toBe('2026-01-03'); // samedi
    expect(dateFor(START, 0, 4)).toBe('2026-01-04'); // dimanche
    expect(dateFor(START, 0, 0)).toBe('2026-01-05'); // lundi = jour 3 du combine
  });

  it('la semaine 1 n’a pas de lundi : ses 4 séances commencent le mercredi', () => {
    const s1 = schedule(START).filter((s) => s.week === 1);
    expect(s1.map((s) => s.day)).toEqual([1, 2, 3, 4]);
    expect(s1[0]!.date).toBe('2026-01-07');
  });

  it('les trois jours du combine sont groupés sous la semaine 0', () => {
    const s0 = schedule(START).filter((s) => s.week === 0);
    expect(s0.map((s) => s.day)).toEqual([3, 4, 0]);
    expect(s0.map((s) => s.date)).toEqual(['2026-01-03', '2026-01-04', '2026-01-05']);
  });

  it('la semaine 1 commence le mercredi', () => {
    expect(dateFor(START, 1, 1)).toBe('2026-01-07'); // mercredi
    expect(dateFor(START, 1, 2)).toBe('2026-01-09'); // vendredi
    expect(dateFor(START, 1, 3)).toBe('2026-01-10'); // samedi
    expect(dateFor(START, 1, 4)).toBe('2026-01-11'); // dimanche
  });

  it('la semaine 2 reprend un rythme complet', () => {
    expect(dateFor(START, 2, 0)).toBe('2026-01-12'); // lundi
    expect(dateFor(START, 2, 4)).toBe('2026-01-18'); // dimanche
  });

  it('chaque séance tombe le bon jour de la semaine', () => {
    const isoDay = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const attendu = ['lundi', 'mercredi', 'vendredi', 'samedi', 'dimanche'];
    for (const s of schedule(START)) {
      const jour = isoDay[new Date(`${s.date}T12:00:00Z`).getUTCDay()];
      expect(jour, `S${s.week} ${s.label} (${s.date})`).toBe(attendu[s.day]);
    }
  });

  it('le programme compte 62 séances : 3 du combine + 4 en S1 + 11 × 5', () => {
    const all = schedule(START);
    expect(all).toHaveLength(3 + 4 + 11 * 5);
    expect(all[0]!.date).toBe('2026-01-03');
    expect(all[all.length - 1]!.week).toBe(12);
    expect(all[all.length - 1]!.day).toBe(4);
  });

  it('les séances sont strictement croissantes dans le temps', () => {
    const all = schedule(START);
    for (let i = 1; i < all.length; i++) {
      expect(all[i]!.date > all[i - 1]!.date, `${all[i - 1]!.date} → ${all[i]!.date}`).toBe(true);
    }
  });

  it('mardi et jeudi sont toujours des jours de repos', () => {
    const dates = new Set(schedule(START).map((s) => s.date));
    for (let d = 0; d < 90; d++) {
      const iso = addDays(START, d);
      const jour = new Date(`${iso}T12:00:00Z`).getUTCDay();
      if (jour === 2 || jour === 4) expect(dates.has(iso), iso).toBe(false);
    }
  });
});

describe('écran Aujourd’hui', () => {
  it('reconnaît un jour de séance', () => {
    const t = locateToday(START, '2026-01-07')!;
    expect(t.kind).toBe('session');
    if (t.kind === 'session') {
      expect(t.session.week).toBe(1);
      expect(t.session.day).toBe(1);
    }
  });

  it('un mardi annonce la prochaine séance', () => {
    const t = locateToday(START, '2026-01-13')!; // mardi S2
    expect(t.kind).toBe('rest');
    if (t.kind === 'rest') {
      expect(t.next.date).toBe('2026-01-14'); // mercredi
      expect(t.next.week).toBe(2);
      expect(t.daysUntil).toBe(1);
    }
  });

  it('un jeudi annonce le vendredi', () => {
    const t = locateToday(START, '2026-01-15')!;
    expect(t.kind).toBe('rest');
    if (t.kind === 'rest') expect(t.next.label).toBe('Vendredi');
  });

  it('avant le début, annonce le premier jour', () => {
    const t = locateToday(START, '2025-12-28')!;
    expect(t.kind).toBe('before');
    if (t.kind === 'before') expect(t.daysUntil).toBe(6);
  });

  it('après la fin, annonce que c’est terminé', () => {
    const t = locateToday(START, '2026-05-01')!;
    expect(t.kind).toBe('finished');
  });

  it('sans date de début, rien à afficher', () => {
    expect(locateToday('', '2026-01-07')).toBeNull();
  });
});

describe('navigation manuelle', () => {
  it('recule et avance d’une séance', () => {
    expect(previousSession(START, 1, 1)!.week).toBe(0); // avant mercredi S1 : le lundi du combine
    expect(previousSession(START, 1, 1)!.day).toBe(0);
    expect(nextSession(START, 1, 1)!.day).toBe(2); // après : vendredi
    expect(previousSession(START, 0, 3)).toBeNull(); // première séance du programme
    expect(nextSession(START, 12, 4)).toBeNull(); // dernière
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
  it('les dates des 3 jours du combine sont identiques quel que soit « aujourd’hui »', () => {
    // Scénario réel : combine jour 1 fait le mercredi 9, appli rouverte le 12.
    const ancre = '2026-09-09';
    const attendu = ['2026-09-09', '2026-09-10', '2026-09-11'];

    for (const aujourdhui of ['2026-09-09', '2026-09-12', '2026-11-30']) {
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

  it('jour 2 et jour 3 restent calés sur l’ancre, pas sur la date d’ouverture', () => {
    const ancre = '2026-09-09';
    expect(dateFor(ancre, 0, 4)).toBe('2026-09-10'); // jour 2
    expect(dateFor(ancre, 0, 0)).toBe('2026-09-11'); // jour 3
    // Aucune de ces fonctions ne lit l'horloge : même résultat, toujours.
    expect(dateFor(ancre, 0, 0)).toBe(dateFor(ancre, 0, 0));
  });

  it('corriger l’ancre en Réglages décale tout le calendrier d’un bloc', () => {
    const avant = schedule('2026-09-10'); // jeudi saisi par erreur
    const apres = schedule('2026-09-12'); // samedi réel
    expect(apres).toHaveLength(avant.length);
    for (let i = 0; i < avant.length; i++) {
      expect(daysBetween(avant[i]!.date, apres[i]!.date)).toBe(2);
    }
  });

  it('reconnaît une ancre qui n’est pas un samedi et propose le bon samedi', () => {
    expect(isSaturday('2026-09-12')).toBe(true);
    expect(isSaturday('2026-09-10')).toBe(false); // le jeudi saisi par Guillaume
    expect(nearestSaturday('2026-09-10')).toBe('2026-09-12');
    expect(nearestSaturday('2026-09-09')).toBe('2026-09-12'); // mercredi → samedi suivant
    expect(nearestSaturday('2026-09-13')).toBe('2026-09-12'); // dimanche → la veille
    expect(nearestSaturday('2026-09-12')).toBe('2026-09-12');
  });
});

describe('semaine en cours', () => {
  it('reste sur la semaine de la dernière séance passée', () => {
    expect(currentWeek(START, '2026-01-03')).toBe(0); // samedi du combine
    expect(currentWeek(START, '2026-01-06')).toBe(0); // mardi : le lundi vient de passer
    expect(currentWeek(START, '2026-01-07')).toBe(1); // mercredi, début S1
    expect(currentWeek(START, '2026-01-12')).toBe(2); // lundi S2
  });

  it('avant le début, annonce déjà la semaine 0', () => {
    expect(currentWeek(START, '2025-12-20')).toBe(0);
  });

  it('après la fin, reste sur la dernière semaine', () => {
    expect(currentWeek(START, '2026-12-31')).toBe(12);
  });

  it('sans ancre, ne devine rien', () => {
    expect(currentWeek('', '2026-01-07')).toBeNull();
  });
});
