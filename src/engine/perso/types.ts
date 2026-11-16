/**
 * ME, MYSELF & I — le format d'un programme importé, une fois validé.
 *
 * Source : `docs/ADR-perso.md` (branche `docs/adr-perso`), §2, amendé par
 * l'étape 0 sur le PDF « Training 1 ».
 *
 * ── Ce que ces types décrivent ────────────────────────────────────────────
 *
 * Le programme tel que MAJK le garde APRÈS validation : reconstruit champ par
 * champ, jamais recopié depuis le fichier. Le fichier lui-même est une entrée
 * non fiable ; il n'a pas de type ici, le validateur le lit comme `unknown`.
 *
 * ── Une absence n'est jamais zéro ─────────────────────────────────────────
 *
 * Tout ce que le document ne précise pas vaut `null`, jamais 0 : un repos
 * absent n'est pas un repos de 0 s (le moteur lirait un enchaînement), une
 * charge absente n'est pas une charge de 0 kg. C'est la règle qui prime sur
 * la commodité.
 */

import type { DayIndex } from '../../data/types';

/** Plafonds de garde (ADR §2) et durée maximale (décision de Guillaume, 16/11). */
export const LIMITES = {
  octets: 1_000_000,
  semainesMax: 12,
  lignesParSeance: 40,
  caracteres: 2000,
} as const;

/** L'objectif d'UNE série. Toutes les séries d'une ligne ont le même `type`. */
export type Objectif =
  | { type: 'reps'; reps: number | { min: number; max: number } | 'max' }
  | { type: 'duree'; secondes: number }
  | { type: 'distance'; metres: number };

export interface SerieNormalisee {
  objectif: Objectif;
  /** Seulement si le document écrit des kilos. */
  chargeKg: number | null;
}

export interface PrescriptionNormalisee {
  /** Une entrée par série, dans l'ordre : les deux formes du fichier finissent ici. */
  series: SerieNormalisee[];
  /** « de chaque côté », « de chaque jambe » — les libellés que le moteur sait afficher. */
  cote: 'côté' | 'jambe' | null;
  /** `0` = écrit « sans repos » par le document ; `null` = non précisé. */
  reposSec: number | null;
}

/**
 * Compatible : séries à valider et chrono. Consultable : texte d'origine
 * seul, aucune série. Le troisième état, bloquant, n'existe pas ici : un
 * programme bloquant est refusé avant d'avoir un état.
 */
export type EtatLigne = 'compatible' | 'consultable';

export interface LigneNormalisee {
  exerciceId: string;
  /** Intertitre d'un bloc du document (« SEANCE ABDOS »). */
  section: string | null;
  /** Le texte du document, au caractère près. Toujours affiché. */
  texteOriginal: string;
  /** Superset ou circuit : lignes consécutives qui partagent ce nom. */
  groupe: string | null;
  prescription: PrescriptionNormalisee | null;
  etat: EtatLigne;
}

export interface SeanceNormalisee {
  id: string;
  jour: DayIndex;
  titre: string;
  dureeMinutes: number | null;
  notes: string[];
  lignes: LigneNormalisee[];
}

export interface BlocNormalise {
  /** `null` : semaine type unique, répétée sur la durée choisie à l'import. */
  numeros: number[] | null;
  libelle: string | null;
  seances: SeanceNormalisee[];
}

export type SujetDecision = 'jours' | 'exclusion' | 'identite' | 'convention' | 'texte';

/** Ce que Guillaume a tranché parce que le document ne le disait pas. */
export interface DecisionConversion {
  sujet: SujetDecision;
  texte: string;
}

export interface ExerciceNormalise {
  id: string;
  nom: string;
  consignes: string[];
}

export interface ProgrammeNormalise {
  schemaVersion: 1;
  uid: string;
  nom: string;
  versionSource: string | null;
  source: { document: string; auteur: string | null };
  /** `null` : le document ne la donne pas, MAJK la demandera à l'import. */
  dureeSemaines: number | null;
  consignes: string[];
  decisions: DecisionConversion[];
  exercices: ExerciceNormalise[];
  semaines: BlocNormalise[];
}

export interface LigneConsultable {
  chemin: string;
  exerciceId: string;
  texteOriginal: string;
}

export interface RapportCompatibilite {
  /** Lignes décrites dans le fichier (une semaine type compte une fois). */
  lignes: number;
  compatibles: number;
  consultables: LigneConsultable[];
  /** « Suivi complet » seulement si AUCUNE ligne n'est consultable. */
  suiviComplet: boolean;
  /** Le document ne fixe pas la durée : MAJK posera la question. */
  dureeADemander: boolean;
}

export type CodeErreur =
  | 'json-invalide'
  | 'version-inconnue'
  | 'structure-invalide'
  | 'identifiant-duplique'
  | 'prescription-incompatible';

export interface ErreurValidation {
  code: CodeErreur;
  /** Où corriger, ex. `semaines[0].seances[1].lignes[3].prescription`. */
  chemin: string;
  message: string;
}

export type ResultatValidation =
  | { ok: false; erreurs: ErreurValidation[] }
  | { ok: true; programme: ProgrammeNormalise; rapport: RapportCompatibilite };
