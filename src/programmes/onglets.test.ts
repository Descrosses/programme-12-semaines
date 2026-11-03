/**
 * Les garde-fous de la barre du bas.
 *
 * ── Ce que ces tests empêchent, concrètement ──────────────────────────────
 *
 * La barre a longtemps été écrite en dur dans `App.tsx`. Un cycle MASS
 * affichait donc les six onglets de POWER 12 : un onglet Combine qui réclame
 * « un deadlift et un squat 1RM » à un programme qui ne prescrit aucun kilo,
 * un onglet Progrès qui propose une courbe de développé couché dans un
 * programme où le développé couché ne figure pas, un onglet Nutrition qui
 * annonce 3 226 kcal là où le document interdit de chiffrer les calories, et
 * un bloc « 1RM testés » dans les Réglages.
 *
 * Rien de tout ça ne plantait. C'est exactement pour cette raison que ces
 * tests existent : un écran qui répond aux questions d'un autre programme est
 * une panne silencieuse, et seul un test la rend bruyante.
 */

import { describe, expect, it } from 'vitest';
import { schedule } from '../engine/calendar';
import { EXERCICES_MASS4 } from './mass4/exercices';
import { SEANCES_MASS4 } from './mass4/seances';
import { MOUVEMENTS_SUIVIS } from './mass4/suivi';
import { MODULES, moduleParId } from './registre';
import type { VueProgramme } from './types';

/**
 * Les vues que `App.tsx` sait rendre.
 *
 * Tenue à la main, et c'est voulu : si un programme déclare une vue absente de
 * cette liste, l'aiguillage de `App.tsx` tombe dans son cas par défaut et
 * affiche la séance du jour à la place de l'écran demandé — sans erreur.
 * Ajouter une vue oblige donc à toucher les deux endroits.
 */
const VUES_RENDUES: readonly VueProgramme[] = [
  'today',
  'week',
  'nutrition',
  'nutrition-principes',
  'progress',
  'progress-volume',
  'combine',
  'mesures',
  'settings',
];

describe('onglets déclarés par les programmes', () => {
  it('ne déclare aucune vue que l’application ne sait pas rendre', () => {
    const inconnues = MODULES.flatMap((m) =>
      m.onglets.map((o) => o.vue).filter((v) => !VUES_RENDUES.includes(v)),
    );
    expect(inconnues).toEqual([]);
  });

  it('ne vise jamais deux fois la même route dans un même programme', () => {
    /*
     * Deux onglets sur la même route donneraient deux boutons actifs en même
     * temps, et le second serait inatteignable.
     */
    for (const m of MODULES) {
      const routes = m.onglets.map((o) => o.route);
      expect({ id: m.id, uniques: new Set(routes).size }).toEqual({
        id: m.id,
        uniques: routes.length,
      });
    }
  });

  it('donne à chaque programme la séance du jour et sa semaine', () => {
    // Sans ces deux onglets, un programme n'a aucun moyen d'ouvrir une séance.
    for (const m of MODULES) {
      const routes = m.onglets.map((o) => o.route);
      expect({ id: m.id, today: routes.includes('today') }).toEqual({ id: m.id, today: true });
      expect({ id: m.id, week: routes.includes('week') }).toEqual({ id: m.id, week: true });
    }
  });

  it('garde à POWER 12 exactement la barre qu’il avait', () => {
    /*
     * Ce test est un verrou de non-régression, pas une préférence : la
     * condition posée était « ne perdre aucune fonctionnalité existante ».
     * Libellés et pictogrammes compris, parce qu'une barre dont les icônes
     * changent est une barre que l'utilisateur doit réapprendre.
     */
    expect(moduleParId('power12')?.onglets).toEqual([
      { route: 'today', label: 'Aujourd’hui', icon: 'play', vue: 'today' },
      { route: 'week', label: 'Semaine', icon: 'calendar', vue: 'week' },
      { route: 'nutrition', label: 'Nutrition', icon: 'meal', vue: 'nutrition' },
      { route: 'progress', label: 'Progrès', icon: 'chart', vue: 'progress' },
      { route: 'combine', label: 'Combine', icon: 'stopwatch', vue: 'combine' },
      { route: 'settings', label: 'Réglages', icon: 'settings', vue: 'settings' },
    ]);
  });

  it('ne donne à MASS 4 ni combine, ni plan alimentaire chiffré, ni 1RM', () => {
    const mass = moduleParId('mass4');
    const routes = mass?.onglets.map((o) => o.route) ?? [];
    const vues = mass?.onglets.map((o) => o.vue) ?? [];

    // Le combine mesure des maximums : MASS n'en prescrit aucun.
    expect(routes).not.toContain('combine');
    expect(vues).not.toContain('combine');
    // L'écran Nutrition de POWER chiffre calories et macros ; le document de
    // MASS 4 l'interdit explicitement.
    expect(vues).not.toContain('nutrition');
    // L'écran Progrès de POWER suit squat, bench, deadlift et tractions.
    expect(vues).not.toContain('progress');
    // Et les réglages de force n'ont rien à régler ici.
    expect(mass?.reglages.force).toBe(false);
  });

  it('donne à MASS 4 son onglet Mesures, à la place du combine', () => {
    expect(moduleParId('mass4')?.onglets).toEqual([
      { route: 'today', label: 'Aujourd’hui', icon: 'play', vue: 'today' },
      { route: 'week', label: 'Semaine', icon: 'calendar', vue: 'week' },
      { route: 'nutrition', label: 'Nutrition', icon: 'meal', vue: 'nutrition-principes' },
      { route: 'progress', label: 'Progrès', icon: 'chart', vue: 'progress-volume' },
      { route: 'mesures', label: 'Mesures', icon: 'ruler', vue: 'mesures' },
      { route: 'settings', label: 'Réglages', icon: 'settings', vue: 'settings' },
    ]);
  });

  it('réserve les réglages de force au programme qui s’en sert', () => {
    expect(moduleParId('power12')?.reglages.force).toBe(true);
  });

  it('garde à POWER 12 les mots exacts de son écran Réglages', () => {
    /*
     * Verrou de non-régression : ces textes vivaient en dur dans l'écran. Les
     * déplacer dans le module ne devait rien changer à ce que POWER affiche.
     */
    expect(moduleParId('power12')?.reglages).toEqual({
      eyebrow: 'Programme 12 semaines',
      visuel: 'athlete',
      refPoids: '§12',
      force: true,
    });
  });

  it('ne prête à MASS 4 ni photo, ni référence de document, ni combine', () => {
    const mass = moduleParId('mass4');
    /*
     * Sans photo à lui, MASS n'emprunte pas celle de POWER : l'écran Réglages
     * affichait un joueur de football américain au-dessus d'un programme de
     * bodybuilding.
     */
    expect(mass?.reglages.visuel).toBeUndefined();
    // « §12 » renvoie au document de POWER, que MASS ne suit pas.
    expect(mass?.reglages.refPoids).toBeNull();
    // Et sans semaine 0, l'écran ne doit pas parler de combine initial.
    expect(mass?.semaines).not.toContain(0);
  });
});

describe('mouvements suivis par l’écran Progrès de MASS 4', () => {
  it('existe tous au catalogue de MASS 4', () => {
    /*
     * Un identifiant faux ne casse rien : la courbe reste vide et l'écran
     * annonce « rien d'enregistré » alors que les séries ont été validées.
     */
    const absents = MOUVEMENTS_SUIVIS.map((m) => m.id).filter(
      (id) => EXERCICES_MASS4[id] === undefined,
    );
    expect(absents).toEqual([]);
  });

  it('est réellement programmé dans une séance, et une seule', () => {
    for (const m of MOUVEMENTS_SUIVIS) {
      const seances = SEANCES_MASS4.filter((s) => s.lignes.some((l) => l.exerciceId === m.id)).map(
        (s) => s.jour,
      );
      expect({ id: m.id, seances }).toEqual({ id: m.id, seances: [seances[0]] });
    }
  });

  it('couvre les quatre séances de la semaine, une chacune', () => {
    /*
     * Quatre mouvements pour quatre séances : si deux venaient de la même
     * séance, une séance entière n'aurait aucune courbe et personne ne le
     * verrait — l'écran afficherait quatre boutons, tous légitimes.
     */
    const jours = MOUVEMENTS_SUIVIS.map(
      (m) => SEANCES_MASS4.find((s) => s.lignes.some((l) => l.exerciceId === m.id))?.jour,
    );
    /*
     * On compare les ensembles, pas les listes : l'ordre des boutons est celui
     * de l'application de référence (incliné, tirage, militaire, squat), qui
     * n'est pas l'ordre de la semaine (militaire lundi, tirage mardi, incliné
     * jeudi, squat samedi). Les deux sont justes, et c'est l'ordre connu de
     * l'utilisateur qui a été gardé.
     */
    expect([...jours].sort()).toEqual(SEANCES_MASS4.map((s) => s.jour));
    expect(new Set(jours).size).toBe(MOUVEMENTS_SUIVIS.length);
  });

  it('suit le mouvement lourd de la séance, pas forcément le premier', () => {
    /*
     * Deux séances sur quatre ouvrent par un mouvement d'isolation qui
     * pré-fatigue le muscle. Ce test écrit noir sur blanc que ce n'est pas un
     * oubli : l'oiseau ouvre la séance épaules, le suivi porte sur le
     * développé militaire qui vient après.
     */
    const premiers = SEANCES_MASS4.map((s) => s.lignes[0]?.exerciceId);
    const suivis = MOUVEMENTS_SUIVIS.map((m) => m.id);
    expect(premiers).toContain('oiseau-machine');
    expect(suivis).not.toContain('oiseau-machine');
    expect(premiers).toContain('ecarte-poulie-basse');
    expect(suivis).not.toContain('ecarte-poulie-basse');
  });
});

describe('calendrier des programmes', () => {
  it('fait tomber la première séance de chaque programme SUR sa date de début', () => {
    /*
     * Le défaut que ce test verrouille : le calendrier calculait les dates
     * comme si tout programme commençait en semaine 0. MASS 4, qui commence en
     * semaine 1, voyait donc toutes ses séances décalées d'une semaine — la
     * date choisie dans les réglages n'était pas celle de la première séance.
     *
     * Écrit sur les VRAIS modules, pas sur une structure de test : c'est la
     * cohérence entre ce qu'un programme déclare et ce que le calendrier en
     * fait qui doit tenir.
     */
    const ancre = '2026-11-02'; // un lundi
    for (const m of MODULES) {
      const premiere = schedule(ancre, m)[0];
      expect({ id: m.id, date: premiere?.date }).toEqual({ id: m.id, date: ancre });
    }
  });

  it('donne à chaque programme le nombre de séances qu’il déclare', () => {
    const ancre = '2026-11-02';
    for (const m of MODULES) {
      const attendu = m.semaines.reduce((n, w) => n + m.joursDeLaSemaine(w).length, 0);
      expect({ id: m.id, n: schedule(ancre, m).length }).toEqual({ id: m.id, n: attendu });
    }
  });
});
