/**
 * La logique du questionnaire « Bilan sportif et nutrition », portée du site
 * fonction par fonction (`docs/questionnaires/bilan-sportif/bilan.js`).
 *
 * Pur : aucun React, aucune base. Chaque fonction porte le nom de celle du
 * site entre parenthèses ; le test fait tourner les deux côte à côte et
 * compare leurs résultats sur des centaines de réponses.
 *
 * Ce que l'appli ne fait PAS de ces réponses : ni programme, ni charge, ni
 * cible. Le résumé part chez Guillaume, qui décide. Les « bases candidates »
 * sont celles du site (indicatif, pour le coach) et ne désignent aucun
 * programme de l'appli.
 */

import {
  AUCUN,
  BASES,
  DAYS,
  ENVOI,
  HORS_SITU,
  SECTIONS,
  SITUATIONS,
  VIGILANCE,
  type Condition,
  type GroupeCoche,
  type QuestionBilan,
  type SectionBilan,
} from '../data/questionnaireBilanSportif';

export type Reponses = Record<string, unknown>;

export interface EtatBilan {
  name: string;
  profil: '' | 'debutant' | 'sportif';
  situ: string[];
  A: Reponses;
  /** −1 = accueil ; 0…n−1 = section ; n = résumé. */
  step: number;
  /** Date du consentement (« 23/11/2026 »), ou vide. */
  consent: string;
}

export function etatVide(): EtatBilan {
  return { name: '', profil: '', situ: [], A: {}, step: -1, consent: '' };
}

const texte = (v: unknown) => (v == null ? '' : String(v));
const liste = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
const groupe = (v: unknown): Record<string, string> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, string>) : {};

// ------------------------------------------------------------- conditions --

/** (hasMethode) */
export const aLaMethode = (A: Reponses, m: string) => liste(A.q3b).includes(m);

/** (goals) */
export function objectifs(A: Reponses): { athle: boolean; force: boolean } {
  const q3 = texte(A.q3);
  const q5 = liste(A.q5);
  const athle =
    [
      'Améliorer explosivité / vitesse / qualités athlétiques',
      'Préparation à un sport ou une épreuve',
    ].includes(q3) ||
    q5.includes('Explosivité') ||
    q5.includes('Performance sportive');
  const force =
    athle ||
    ['Devenir plus fort', 'Prendre du muscle'].includes(q3) ||
    q5.includes('Force') ||
    q5.includes('Muscle') ||
    aLaMethode(A, 'Musculation');
  return { athle, force };
}

export function condition(si: Condition, A: Reponses): boolean {
  switch (si) {
    case 'pilates':
      return aLaMethode(A, 'Pilates');
    case 'douleur':
      return A.q6 === 'Oui';
    case 'echeance':
      return A.q12b === "J'ai une échéance précise";
    case 'athle':
      return objectifs(A).athle;
    case 'force':
      return objectifs(A).force;
  }
}

export const estVisible = (x: { si?: Condition }, A: Reponses) =>
  x.si === undefined || condition(x.si, A);

/** (visibleSections) */
export function sectionsVisibles(etat: EtatBilan): SectionBilan[] {
  return SECTIONS.filter(
    (s) =>
      (s.mod === 1 ||
        (s.mod === 2 && etat.profil === 'sportif') ||
        (s.mod === 3 && s.key !== undefined && etat.situ.includes(s.key))) &&
      estVisible(s, etat.A),
  );
}

export const groupesVisibles = (q: QuestionBilan, A: Reponses): GroupeCoche[] =>
  (q.groups ?? []).filter((g) => estVisible(g, A));

// -------------------------------------------------------------- sécurité --

/** (isRed) */
export const estRouge = (A: Reponses) => ['h1', 'h2', 'h3', 'h4'].some((k) => A[k] === 'Oui');

const AUCUNE_REPONSE = /^\s*(non|aucun|aucune|rien|ras|n\/a|-)?\s*\.?\s*$/i;

/** (vigilance) */
export function vigilance(etat: EtatBilan): {
  reds: string[];
  oranges: string[];
  level: 'ROUGE' | 'ORANGE' | 'VERT';
} {
  const A = etat.A;
  const reds: string[] = [];
  const oranges: string[] = [];
  for (const k of ['h1', 'h2', 'h3', 'h4'] as const) if (A[k] === 'Oui') reds.push(VIGILANCE[k]);
  if (A.h5 === 'Oui') oranges.push(VIGILANCE.h5);
  if (A.h6 === 'Oui') oranges.push(VIGILANCE.h6);
  if (A.q6 === 'Oui') oranges.push(VIGILANCE.q6);
  if (A.q7 && !AUCUNE_REPONSE.test(texte(A.q7))) oranges.push(VIGILANCE.q7);
  if (A.q8 && !AUCUNE_REPONSE.test(texte(A.q8))) oranges.push(VIGILANCE.q8);
  etat.situ
    .filter((k) => ['pp', 'b', 's', 'a'].includes(k))
    .forEach((k) => oranges.push(SITUATIONS.find((x) => x.key === k)!.l.toLowerCase()));
  return { reds, oranges, level: reds.length ? 'ROUGE' : oranges.length ? 'ORANGE' : 'VERT' };
}

export type Arret = { type: 'rouge' } | { type: 'hors'; why: string };

/** (scopeCheck) — le questionnaire s'arrête ici, avant toute section suivante. */
export function arret(etat: EtatBilan): Arret | null {
  const A = etat.A;
  if (estRouge(A)) return { type: 'rouge' };
  if (A.h6 === 'Oui') return { type: 'hors', why: 'une grossesse en cours' };
  const age = parseFloat(texte(A.q1).replace(',', '.'));
  if (isFinite(age) && age < 18) return { type: 'hors', why: 'un âge de moins de 18 ans' };
  const k = etat.situ.find((x) => HORS_SITU[x]);
  if (k) return { type: 'hors', why: `la situation « ${HORS_SITU[k]} »` };
  return null;
}

// ---------------------------------------------------------- les réponses --

/** (answered) */
export function repondue(q: QuestionBilan, A: Reponses): boolean {
  const v = A[q.id];
  if (q.type === 'group') {
    const o = groupe(v);
    const vals = (q.fields ?? []).map((f) => texte(o[f.k]).trim());
    return q.req === 'any' ? vals.some(Boolean) : vals.every(Boolean);
  }
  if (Array.isArray(v)) return v.length > 0;
  return v != null && texte(v).trim() !== '';
}

/** (validateSection) — les questions obligatoires, visibles et sans réponse. */
export function manquantes(sec: SectionBilan, A: Reponses): string[] {
  return sec.qs.filter((q) => q.req && estVisible(q, A) && !repondue(q, A)).map((q) => q.id);
}

/**
 * Cocher ou décocher une option d'une question à choix multiples, comme le
 * site : l'option exclusive chasse les autres (et inversement), le maximum
 * refuse la case de trop, l'ordre reste celui des options.
 */
export function basculerChoix(
  q: QuestionBilan,
  cur: string[],
  o: string,
  coche: boolean,
): string[] {
  let set = new Set(cur);
  if (coche) {
    if (q.exclusive) {
      if (o === q.exclusive) set = new Set();
      else set.delete(q.exclusive);
    }
    set.add(o);
  } else set.delete(o);
  let arr = (q.opts ?? []).filter((x) => set.has(x));
  if (q.max && arr.length > q.max) arr = arr.filter((x) => x !== o);
  return arr;
}

/**
 * La liste d'exercices maîtrisés (q11) : « Aucun de ces exercices » chasse
 * les autres et inversement. Comme le site, seules les cases des groupes
 * affichés comptent, dans leur ordre.
 */
export function basculerCoche(q: QuestionBilan, A: Reponses, o: string, coche: boolean): string[] {
  let set = new Set(liste(A[q.id]));
  if (coche) {
    if (o === AUCUN) set = new Set();
    else set.delete(AUCUN);
    set.add(o);
  } else set.delete(o);
  return groupesVisibles(q, A)
    .flatMap((g) => [...g.o])
    .filter((x) => set.has(x));
}

// ------------------------------------------------------------- le résumé --

/** (est1RM) — la formule du SITE, affichée au coach seulement ; l'appli ne s'en sert pour rien d'autre. */
export function est1RM(kg: unknown, reps: unknown): number | null {
  const k = parseFloat(texte(kg).replace(',', '.'));
  const r = parseFloat(texte(reps).replace(',', '.'));
  if (!isFinite(k) || !isFinite(r) || k <= 0 || r < 1 || r > 12) return null;
  return Math.round(r === 1 ? k : k * (1 + r / 30));
}

/** (fmtAnswer) */
export function reponseLue(q: QuestionBilan, A: Reponses): string {
  const v = A[q.id];
  const autre = texte(A[`${q.id}_o`]);
  if (q.type === 'check' && autre.trim() && (!v || !liste(v).length))
    return `Autre : ${autre.trim()}`;
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '';
  if (q.type === 'num') return `${texte(v)} ${q.unit ?? ''}`;
  if (q.type === 'scale') return `${texte(v)}/10`;
  if (q.type === 'check') {
    const arr = liste(v);
    if (autre.trim()) arr.push(`Autre : ${autre.trim()}`);
    return arr.join(', ');
  }
  if (q.type === 'single' || q.type === 'multi') {
    const arr = Array.isArray(v) ? liste(v) : [texte(v)];
    return arr.map((x) => (x === 'Autre' && autre ? `Autre (${autre})` : x)).join(', ');
  }
  if (q.type === 'group') {
    const o = groupe(v);
    const fields = q.fields ?? [];
    if (q.rm) {
      const exo = texte(o.exo).trim();
      const kg = texte(o.kg).trim();
      const re = texte(o.reps).trim();
      if (exo || kg || re) {
        let out = exo ? `${exo} : ` : '';
        if (kg || re) {
          out += `${kg || '?'} kg × ${re || '?'}`;
          const e = est1RM(kg, re);
          if (e && re !== '1') out += ` (max estimé ≈ ${e} kg)`;
        } else out += 'charge non renseignée';
        return out;
      }
      return '';
    }
    const parts: string[] = [];
    for (const f of fields) {
      const x = texte(o[f.k]).trim();
      if (!x) continue;
      if (q.zero) parts.push(`${f.l} : ${x === '0' ? 'impossible' : `${x} ${f.u ?? ''}`}`);
      else parts.push((fields.length > 1 ? `${f.l} : ` : '') + x + (f.u ? ` ${f.u}` : ''));
    }
    return parts.join(' ; ');
  }
  return texte(v).trim();
}

/** (niveauTag) */
export function niveau(q9: unknown): string {
  const v = texte(q9);
  if (v.startsWith('Jamais') || v.startsWith('Débutant')) return 'débutant';
  if (v.startsWith('Intermédiaire') || v.startsWith('Confirmé')) return 'intermédiaire';
  if (v.startsWith('Avancé')) return 'avancé';
  return '';
}

export interface Etiquettes {
  objectif: string;
  priorites: string[];
  methodes: string[];
  niveau: string;
  lieu: string;
  materiel: string;
  seances: string;
  duree_max_seance_min: number | '';
  duree_programme: string;
  sexe: string;
  contraintes_physiques: string;
  preferences: string[];
}

/** (buildTags) */
export function etiquettes(A: Reponses): Etiquettes {
  const g2 = groupe(A.q2);
  const q13 = groupe(A.q13);
  const mins = DAYS.map((d) => parseFloat(texte(q13[d]).replace(',', '.'))).filter(
    (x) => isFinite(x) && x > 0,
  );
  const autre = texte(A.q3_o).trim();
  const obj = A.q3 === 'Autre' && autre ? `Autre (${autre})` : texte(A.q3);
  return {
    objectif: obj,
    priorites: liste(A.q5),
    methodes: liste(A.q3b),
    niveau: niveau(A.q9),
    lieu: texte(A.q14),
    materiel: texte(A.q15).trim(),
    seances: texte(A.q12),
    duree_max_seance_min: mins.length ? Math.max(...mins) : '',
    duree_programme: texte(A.q12b),
    sexe: texte(g2.sexe),
    contraintes_physiques:
      A.q6 === 'Oui'
        ? texte(A.q6b).trim() || 'douleur ou blessure déclarée'
        : 'aucune douleur déclarée',
    preferences: liste(A.q11),
  };
}

/** (suggestBases) — les bases du SITE, pour le coach ; aucune n'est un programme de l'appli. */
export function basesCandidates(
  tags: Etiquettes,
): { id: string; label: string; score: number; raisons: string[] }[] {
  return BASES.map((b) => {
    let score = 0;
    let ecarte = false;
    const raisons: string[] = [];
    for (const c of b.criteres) {
      const v = tags[c.tag];
      const arr = Array.isArray(v) ? v : [v];
      const ok = arr.some((x) => c.valeurs.includes(x));
      if (ok) {
        score += c.poids;
        raisons.push(c.tag);
      } else if (c.requis) ecarte = true;
      else if (c.ecarteSiDifferent && arr.some((x) => x === 'Homme' || x === 'Femme'))
        ecarte = true;
    }
    return { id: b.id, label: b.label, score: ecarte ? 0 : score, raisons };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** (buildSummary) — le texte envoyé au coach, identique au site au caractère près. */
export function resume(etat: EtatBilan): string {
  const secs = sectionsVisibles(etat);
  const L: string[] = [];
  const profilTxt =
    etat.profil === 'sportif'
      ? 'Sportif (modules 1 et 2)'
      : 'Débutant / remise en forme (module 1)';
  L.push(`BILAN SPORTIF ET NUTRITION : ${etat.name.trim() || 'Sans prénom'}`);
  L.push(`Profil : ${profilTxt}`);
  if (etat.situ.length)
    L.push(
      `Situations particulières : ${etat.situ.map((k) => SITUATIONS.find((s) => s.key === k)!.l).join(', ')}`,
    );
  const A = etat.A;
  const vg = vigilance(etat);
  if (vg.level === 'ROUGE')
    L.push(`NIVEAU DE VIGILANCE : ROUGE (${vg.reds.join(', ')}). Ne pas établir de programme.`);
  else if (vg.level === 'ORANGE')
    L.push(
      `NIVEAU DE VIGILANCE : ORANGE (${vg.oranges.join(', ')}). Adapter le programme et vérifier avant de commencer.`,
    );
  else L.push('NIVEAU DE VIGILANCE : VERT (aucun signal détecté dans le dépistage).');
  if (etat.consent) L.push(`Consentement à l'utilisation des données donné le ${etat.consent}.`);
  const tg = etiquettes(A);
  L.push('');
  L.push(`OBJECTIF PRINCIPAL : ${tg.objectif || 'non renseigné'}`);
  L.push(
    `MÉTHODES / ENTRAÎNEMENTS SOUHAITÉS : ${tg.methodes.length ? tg.methodes.join(' + ') : 'non renseigné'}`,
  );
  let cur = 0;
  for (const sec of secs) {
    const lines: string[] = [];
    for (const q of sec.qs) {
      if (!estVisible(q, A)) continue;
      const a = reponseLue(q, A);
      if (a) lines.push(`${q.n}. ${q.s} : ${a}`);
    }
    if (!lines.length) continue;
    if (sec.mod !== cur) {
      cur = sec.mod;
      L.push('');
      L.push(
        cur === 1
          ? '=== TRONC COMMUN ==='
          : cur === 2
            ? '=== PERFORMANCE ==='
            : '=== SITUATIONS PARTICULIÈRES ===',
      );
    }
    L.push('');
    L.push(`[${sec.title}]`);
    L.push(...lines);
  }
  L.push('');
  L.push('=== ÉTIQUETTES POUR CHOISIR UNE BASE DE PROGRAMME ===');
  L.push(
    `objectif : ${tg.objectif || '-'} | méthodes : ${tg.methodes.join(', ') || '-'} | niveau : ${tg.niveau || '-'}`,
  );
  L.push(
    `lieu : ${tg.lieu || '-'} | séances/semaine : ${tg.seances || '-'} | durée max d'une séance : ${
      tg.duree_max_seance_min ? `${tg.duree_max_seance_min} min` : '-'
    } | durée du programme : ${tg.duree_programme || '-'}`,
  );
  L.push(`matériel : ${tg.materiel || '-'}`);
  L.push(`contraintes physiques : ${tg.contraintes_physiques}`);
  L.push(`sexe (information, ne décide jamais seul) : ${tg.sexe || '-'}`);
  const sug = basesCandidates(tg);
  L.push(
    sug.length
      ? `bases candidates (indicatif, à valider par Guillaume) : ${sug
          .map((b, i) => `${i + 1}. ${b.label} (score ${b.score})`)
          .join(' ; ')}${
          sug.length > 1 && sug[0]!.score - sug[1]!.score <= 1
            ? '. Les deux premières sont proches : combinaison possible (programme hybride).'
            : ''
        }`
      : 'bases candidates : aucune ne correspond. Programme à construire sur mesure, ou base à créer.',
  );
  return L.join('\n');
}

/** Les liens d'envoi (renderSummary). L'e-mail porte le résumé s'il tient dans un lien. */
export function liensEnvoi(etat: EtatBilan): { email: string; whatsapp: string; complet: boolean } {
  const text = resume(etat);
  const nom = etat.name.trim();
  const sujet = ENVOI.sujet + nom;
  const intro = `${ENVOI.bonjour}${nom ? ` (${nom})` : ''}.`;
  const court = intro + ENVOI.colle;
  const plein = encodeURIComponent(`${intro}\n\n${text}`);
  const complet = plein.length < ENVOI.limiteMailto;
  return {
    email: `mailto:${ENVOI.email}?subject=${encodeURIComponent(sujet)}&body=${
      complet ? plein : encodeURIComponent(court)
    }`,
    whatsapp: `https://wa.me/${ENVOI.whatsapp}?text=${encodeURIComponent(court)}`,
    complet,
  };
}
