import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateFor,
  daysBetween,
  humanDate,
  locateToday,
  nextSession,
  previousSession,
  schedule,
} from './calendar';

/** Samedi 3 janvier 2026 — samedi du combine initial. */
const START = '2026-01-03';

describe('calendrier — le calage décidé avec Guillaume', () => {
  it('le combine initial occupe samedi, dimanche, puis le lundi', () => {
    expect(dateFor(START, 0, 3)).toBe('2026-01-03'); // samedi
    expect(dateFor(START, 0, 4)).toBe('2026-01-04'); // dimanche
    expect(dateFor(START, 1, 0)).toBe('2026-01-05'); // lundi = jour 3 du combine
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

  it('le programme compte 62 séances : 2 + 4 + 11 × 5 + 1 du combine initial', () => {
    const all = schedule(START);
    expect(all).toHaveLength(2 + 5 + 11 * 5);
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
    expect(previousSession(START, 1, 1)!.day).toBe(0); // avant mercredi S1 : lundi (combine J3)
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
