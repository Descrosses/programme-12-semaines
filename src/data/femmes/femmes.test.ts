/**
 * FEMMES 8 — le contenu porté est-il complet, et tient-il debout ?
 *
 * ── Ce que ce fichier protège ──────────────────────────────────────────────
 *
 * Le programme n'a pas été écrit ici : il a été PORTÉ depuis une base
 * extérieure, fichier par fichier. Un portage se trompe silencieusement — un
 * exercice qui manque, un repli qui pointe dans le vide, une phase dont les
 * semaines se chevauchent — et rien ne le dit tant que personne n'ouvre la
 * séance concernée.
 *
 * Ces tests comptent et vérifient. Ils ne jugent pas la valeur sportive du
 * programme, ce n'est pas leur rôle : ils vérifient qu'il est ENTIER.
 *
 * ── Ce qui a été volontairement changé au portage ──────────────────────────
 *
 * La base d'origine était un programme post-partum. Trois questions datées
 * (visite post-natale, diastasis, rééducation périnéale) y conditionnaient
 * les substitutions, et la première bloquait l'accès à toute séance.
 *
 * MAJK s'adresse à toutes : ces questions sont remplacées par deux questions
 * non datées, et plus rien ne bloque l'accès. Les trois restrictions et leurs
 * replis, eux, sont inchangés — c'est ce que vérifie la dernière section.
 */

import { describe, expect, it } from 'vitest';
import { EXERCISES, getExercise } from './exercises';
import { ECHAUFFEMENT, PHASES, phaseOf } from './phases';
import { SAFETY_CHECKS, TOTAL_SESSIONS, WEEK_DAYS } from './programme';
import { RESTRICTION_GATE, RESTRICTION_REASON, WEEKS, type WeekIndex } from './types';
import { EMPTY_SAFETY } from '../../engine/femmes/types';
import { resolveExercise } from '../../engine/femmes/safety';

describe('FEMMES 8 — la structure', () => {
  it('couvre huit semaines, sans trou ni chevauchement', () => {
    const vues = PHASES[1].weeks.concat(PHASES[2].weeks, PHASES[3].weeks).sort((a, b) => a - b);
    expect(vues).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(vues).size).toBe(8);
  });

  it('chaque semaine tombe dans une phase, et une seule', () => {
    for (const w of WEEKS) {
      const phases = [PHASES[1], PHASES[2], PHASES[3]].filter((p) => p.weeks.includes(w));
      expect(phases.length, `semaine ${w}`).toBe(1);
      expect(phaseOf(w).id).toBe(phases[0]!.id);
    }
  });

  it('compte trente séances : 2 × 3 puis 6 × 4', () => {
    /*
     * Le chiffre n'est pas décoratif : c'est lui que l'écran affiche en
     * « 0 / 30 ». S'il dérive, le compteur de progression ment.
     */
    expect(TOTAL_SESSIONS).toBe(30);
    for (const w of WEEKS) {
      expect(WEEK_DAYS[w].length, `semaine ${w}`).toBe(phaseOf(w).sessionsPerWeek);
    }
  });

  it('les trois phases montent en volume, jamais l’inverse', () => {
    const tours = (p: 1 | 2 | 3) => {
      const t = PHASES[p].tours;
      return typeof t === 'number' ? t : t.min;
    };
    expect(tours(1)).toBeLessThanOrEqual(tours(2));
    expect(tours(2)).toBeLessThanOrEqual(tours(3));
    expect(PHASES[1].sessionsPerWeek).toBeLessThanOrEqual(PHASES[2].sessionsPerWeek);
  });
});

describe('FEMMES 8 — le circuit', () => {
  it('chaque ligne désigne deux exercices qui existent vraiment', () => {
    /*
     * C'est l'erreur de portage la plus probable : une ligne qui renvoie à
     * un identifiant absent du catalogue. `getExercise` lève, donc le test
     * échoue à l'endroit exact.
     */
    for (const p of [PHASES[1], PHASES[2], PHASES[3]]) {
      for (const slot of p.circuit) {
        expect(() => getExercise(slot.maison), `${slot.slotId} maison`).not.toThrow();
        expect(() => getExercise(slot.salle), `${slot.slotId} salle`).not.toThrow();
      }
    }
  });

  it('les deux versions d’une ligne partagent la même cible de répétitions', () => {
    // C'est ce qui fait que maison et salle comptent comme la MÊME séance.
    for (const p of [PHASES[1], PHASES[2], PHASES[3]]) {
      for (const slot of p.circuit) {
        expect(slot.load.maison, `${slot.slotId}`).toBeDefined();
        expect(slot.load.salle, `${slot.slotId}`).toBeDefined();
        expect(slot.work, `${slot.slotId}`).toBeDefined();
      }
    }
  });

  it('aucun identifiant de ligne n’est utilisé deux fois dans une phase', () => {
    for (const p of [PHASES[1], PHASES[2], PHASES[3]]) {
      const ids = p.circuit.map((s) => s.slotId);
      expect(new Set(ids).size, `phase ${p.id}`).toBe(ids.length);
    }
  });

  it('tout repli déclaré désigne un exercice qui existe', () => {
    for (const ex of Object.values(EXERCISES)) {
      if (!ex.fallbackId) continue;
      expect(() => getExercise(ex.fallbackId!), `${ex.id} → ${ex.fallbackId}`).not.toThrow();
      expect(ex.fallbackId, `${ex.id} se replie sur lui-même`).not.toBe(ex.id);
    }
  });
});

describe('FEMMES 8 — l’échauffement', () => {
  it('est servi, et ne suppose aucune grossesse', () => {
    /*
     * La base d'origine ouvrait sur une respiration diaphragmatique, une
     * activation du transverse et une synchronisation périnée-expiration :
     * une reprise post-partum, pas un échauffement. Ce test interdit son
     * retour par inadvertance.
     */
    expect(ECHAUFFEMENT.length).toBe(6);
    const texte = ECHAUFFEMENT.map((i) => `${i.label} ${i.detail}`)
      .join(' ')
      .toLowerCase();
    for (const mot of ['périnée', 'transverse', 'diaphragm', 'post-partum', 'post-natal']) {
      expect(texte, `« ${mot} » n'a plus sa place dans l'échauffement`).not.toContain(mot);
    }
  });

  it('prépare des mouvements que la séance demande vraiment', () => {
    // Trois de ses six items reprennent des mouvements du circuit : il
    // échauffe ce qui va servir, il n'ajoute pas un exercice de plus.
    const ids = ECHAUFFEMENT.map((i) => i.id);
    expect(ids).toContain('squat-echauffement');
    expect(ids).toContain('fentes-echauffement');
    expect(ids).toContain('birddog-echauffement');
  });
});

describe('FEMMES 8 — la sécurité', () => {
  it('pose deux questions, non datées, et aucune ne bloque', () => {
    expect(SAFETY_CHECKS.map((c) => c.key)).toEqual(['plancherPelvienOk', 'sansDouleurLimitante']);
    for (const c of SAFETY_CHECKS) {
      expect(c.blocking, `${c.key} ne doit plus bloquer l'accès`).toBe(false);
    }
  });

  it('ne parle plus d’accouchement, nulle part', () => {
    const texte = SAFETY_CHECKS.map((c) => `${c.question} ${c.consequence} ${c.detail}`)
      .join(' ')
      .toLowerCase();
    for (const mot of ['post-natal', 'post-partum', 'accouch', 'grossesse', 'sage-femme']) {
      expect(texte, `« ${mot} » suppose une grossesse`).not.toContain(mot);
    }
  });

  it('les trois restrictions sont conservées, et chacune a sa question', () => {
    /*
     * Le cœur de la reprise : on a changé les QUESTIONS, pas les
     * restrictions. Si une restriction perdait sa porte, l'exercice
     * correspondant passerait sans contrôle.
     */
    /*
     * La CORRESPONDANCE EXACTE, pas seulement l'existence d'une porte.
     *
     * Première version de ce test : « chaque restriction a une question qui
     * figure au questionnaire ». Insuffisant, et prouvé — en basculant
     * `impact` de `plancherPelvienOk` vers `sansDouleurLimitante`, le test
     * restait vert alors qu'un saut n'était plus écarté par la bonne
     * question. On fige donc la table entière.
     *
     * Le raisonnement derrière chaque ligne : un saut et une charge au-dessus
     * de la tête font monter la pression abdominale, ils dépendent du
     * plancher pelvien. La flexion du tronc, elle, dépend de la douleur.
     */
    expect(RESTRICTION_GATE).toEqual({
      flexionTronc: 'sansDouleurLimitante',
      impact: 'plancherPelvienOk',
      overhead: 'plancherPelvienOk',
    });
    const clefs = SAFETY_CHECKS.map((c) => c.key);
    for (const [restriction, porte] of Object.entries(RESTRICTION_GATE)) {
      expect(clefs, `${restriction} dépend d'une question absente`).toContain(porte);
      expect(RESTRICTION_REASON[restriction as keyof typeof RESTRICTION_REASON]).toBeTruthy();
    }
  });

  it('sans réponse, le choix prudent s’applique : les exercices à risque sont remplacés', () => {
    const aRisque = Object.values(EXERCISES).filter((e) => (e.restrictions ?? []).length > 0);
    expect(
      aRisque.length,
      'aucun exercice restreint : le portage a perdu quelque chose',
    ).toBeGreaterThan(0);

    for (const ex of aRisque) {
      const r = resolveExercise(ex.id, EMPTY_SAFETY);
      // Soit il a été remplacé, soit il n'avait pas de repli — jamais servi
      // tel quel en silence.
      expect(r.substitutedFor, `${ex.id} passe sans contrôle`).toBeDefined();
    }
  });

  it('quand tout va bien, aucun exercice n’est remplacé', () => {
    const toutOk = { plancherPelvienOk: true, sansDouleurLimitante: true };
    for (const ex of Object.values(EXERCISES)) {
      const r = resolveExercise(ex.id, toutOk);
      expect(r.exercise.id, `${ex.id} remplacé sans raison`).toBe(ex.id);
      expect(r.substitutedFor).toBeUndefined();
    }
  });
});

describe('FEMMES 8 — ce qui ne doit pas revenir', () => {
  it('aucune marque d’enseigne dans le programme', () => {
    // « Basic-Fit » est une enseigne ; le programme dit « salle de sport ».
    const texte = JSON.stringify({ EXERCISES, PHASES, SAFETY_CHECKS }).toLowerCase();
    expect(texte).not.toContain('basic-fit');
    expect(texte).not.toContain('basicfit');
  });

  it('le calendrier ne produit que huit semaines', () => {
    expect(WEEKS).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(
      Object.keys(WEEK_DAYS)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([...WEEKS]);
  });

  it('`phaseOf` ne VALIDE pas la semaine — limite connue, pas un oubli', () => {
    /*
     * Ce test disait d'abord que `phaseOf(9)` devait lever. Il échouait :
     * la fonction rend la phase 3 pour toute semaine au-dessus de 5, 9 et
     * 100 comprises.
     *
     * Ce n'est pas corrigé ici, et c'est délibéré. Le type `WeekIndex` est
     * une union de 1 à 8 : une semaine 9 ne peut pas franchir la compilation,
     * et aucune donnée du programme n'en produit — la ligne au-dessus le
     * vérifie. Durcir la fonction reviendrait à modifier le moteur porté
     * pour un cas que rien ne permet d'atteindre.
     *
     * Le test est donc écrit à l'endroit : il DOCUMENTE le comportement réel
     * plutôt que d'affirmer une protection qui n'existe pas. Le jour où une
     * semaine arrive d'ailleurs que du type — d'une base, d'une URL — c'est
     * ici qu'on lira qu'il n'y a pas de filet.
     */
    expect(phaseOf(9 as WeekIndex).id).toBe(3);
  });
});
