/**
 * ME, MYSELF & I — le module qui joue un programme importé (lot 4 de l'ADR).
 *
 * ── Ce qu'il fait, et ce qu'il refuse de faire ────────────────────────────
 *
 * Il transcrit une version importée en séances, ligne pour ligne, série pour
 * série. Il ne calcule RIEN : aucune charge, aucun pourcentage, aucune
 * progression, aucune règle de POWER ni de MASS. Le contexte de séance (1RM,
 * historique, readiness) ne change pas la prescription — seul l'historique
 * sert à écrire un REPÈRE (« Dernière fois : 80 kg »), jamais une valeur
 * pré-remplie.
 *
 * Comme MASS CONGESTION : forme de charge `none`, champ ouvert vide, aucune
 * aide inventée sous la case. Le texte d'origine de chaque ligne est toujours
 * affiché ; une ligne consultable n'a aucune série et n'entre dans aucun
 * compteur.
 *
 * Pur : aucun React, aucune base.
 */

import type { ProgrammeImporteRow } from '../../db/db';
import type { DayIndex, Work } from '../../data/types';
import type { Objectif, SeanceNormalisee, LigneNormalisee } from '../../engine/perso/types';
import type { ResolvedExercise, ResolvedSession } from '../../engine/getSession';
import type { ResolvedLoad } from '../../engine/loadResolver';
import { workLabel } from '../../engine/format';
import type { SessionContext } from '../../engine/types';
import type { ModuleProgramme } from '../types';
import { ficheNative } from './fichesNatives';
import { idExerciceImporte } from './ids';

const SANS_CHARGE: ResolvedLoad = { kg: null, shape: 'none', step: 2.5, source: 'aucune' };

/** L'objectif du document, dans le vocabulaire du moteur. Aucune valeur ajoutée. */
function travailDe(o: Objectif, cote: 'côté' | 'jambe' | null): Work {
  const parCote = cote !== null;
  switch (o.type) {
    case 'reps':
      return {
        kind: 'reps',
        reps: o.reps,
        perSide: parCote,
        ...(cote === null ? {} : { sideLabel: cote }),
      };
    case 'duree':
      return { kind: 'time', seconds: o.secondes, perSide: parCote };
    case 'distance':
      return { kind: 'distance', meters: o.metres, perSide: parCote };
  }
}

/** La dernière charge RÉELLEMENT soulevée sur cet exercice, dans ce cycle. */
function derniereCharge(ctx: SessionContext, id: string): number | null {
  const occurrences = ctx.history[id] ?? [];
  for (let i = occurrences.length - 1; i >= 0; i--) {
    const kg = occurrences[i]!.kg;
    if (kg !== null) return kg;
  }
  return null;
}

function exerciceDe(
  row: ProgrammeImporteRow,
  seance: SeanceNormalisee,
  ligne: LigneNormalisee,
  ctx: SessionContext,
): ResolvedExercise {
  const id = idExerciceImporte(row.cle, ligne.exerciceId);
  const exo = row.document.exercices.find((e) => e.id === ligne.exerciceId);
  const nom = exo?.nom ?? ligne.exerciceId;
  const notes = [ligne.texteOriginal, ...(exo?.consignes ?? [])];
  const repere = derniereCharge(ctx, id);
  if (repere !== null) notes.push(`Dernière fois : ${String(repere).replace('.', ',')} kg`);

  // L'illustration : une image importée (par empreinte), ou une fiche de
  // MAJK désignée par sa clé — si elle existe toujours.
  const lien = row.illustrations?.liens[ligne.exerciceId];
  const fiche = lien !== undefined && 'majk' in lien ? ficheNative(lien.majk) : undefined;
  const commun = {
    def: {
      id,
      name: nom,
      fn: 'libre' as const,
      role: 'accessory' as const,
      ...(lien !== undefined && 'empreinte' in lien ? { illustration: lien.empreinte } : {}),
      ...(fiche === undefined ? {} : { fiche }),
    },
    id,
    name: nom,
    targetRPE: null,
    lastKg: null,
    lastMeasure: null,
    suggestion: null,
    adjustments: [],
    ...(ligne.section === null ? {} : { section: ligne.section }),
    // Le groupe n'existe que dans sa séance : deux séances peuvent réutiliser un nom.
    ...(ligne.groupe === null ? {} : { superset: `${seance.id}-${ligne.groupe}` }),
    ...(ligne.minutesBloc === undefined ? {} : { blocMinutes: ligne.minutesBloc }),
    ...(ligne.reposApresBloc === undefined ? {} : { restApresBlocSec: ligne.reposApresBloc }),
  };

  const p = ligne.prescription;
  if (p === null) {
    /*
     * CONSULTABLE : le texte d'origine, aucune série. Une prescription qu'on
     * ne peut pas exécuter fidèlement reste lisible, jamais déformée, et
     * n'est jamais comptée comme faite.
     */
    return {
      ...commun,
      sets: 0,
      work: { kind: 'maxSet' },
      load: SANS_CHARGE,
      restSec: 0,
      loadLine: 'À lire, hors suivi',
      notes: [
        ...notes,
        'Cette consigne ne se découpe pas en séries sans être déformée : elle est affichée, pas suivie.',
      ],
      planKg: null,
    };
  }

  const series = p.series.map((s) => ({ work: travailDe(s.objectif, p.cote), kg: s.chargeKg }));
  const premiere = series[0]!;
  const uniforme = series.every((s) => JSON.stringify(s) === JSON.stringify(premiere));
  const loadLine = uniforme
    ? workLabel(series.length, premiere.work) +
      (premiere.kg === null ? '' : ` × ${String(premiere.kg).replace('.', ',')} kg`)
    : series
        .map(
          (s) => workLabel(1, s.work).replace(/^1 × /, '') + (s.kg === null ? '' : ` × ${s.kg} kg`),
        )
        .join(' / ');

  // Le passage écrit par le document passe avant le chiffre calculé.
  const affiche = p.affichage;
  return {
    ...commun,
    ...(affiche === undefined ? {} : { travailAffiche: affiche }),
    sets: series.length,
    work: premiere.work,
    load:
      uniforme && premiere.kg !== null
        ? { ...SANS_CHARGE, kg: premiere.kg, source: 'programme' }
        : SANS_CHARGE,
    // `null` = repos non écrit : aucun chrono proposé. Le validateur interdit
    // ce cas dans un groupe, où 0 voudrait dire « enchaîner ».
    restSec: p.reposSec ?? 0,
    // Dans un circuit, le passage écrit REMPLACE le chiffre (« 2 × 20 lentes +
    // 20 rapides » plutôt que « 2 × 40 ») ; seul, il s'affiche sous le chiffre.
    loadLine:
      affiche === undefined || ligne.groupe === null
        ? loadLine
        : series.length > 1
          ? `${String(series.length)} × ${affiche}`
          : affiche,
    notes,
    planKg: uniforme ? premiere.kg : null,
    ...(uniforme ? {} : { objectifsParSerie: series }),
  };
}

/** La durée suivie : celle du document, sinon celle choisie à l'import. */
export function dureeDuProgramme(row: ProgrammeImporteRow): number {
  return row.document.dureeSemaines ?? row.reponses.dureeSemaines ?? 0;
}

/** Les séances d'une semaine : le bloc qui la couvre, ou la semaine type unique. */
function blocDe(row: ProgrammeImporteRow, semaine: number) {
  if (semaine < 1 || semaine > dureeDuProgramme(row)) return null;
  return (
    row.document.semaines.find((b) => b.numeros === null || b.numeros.includes(semaine)) ?? null
  );
}

export function creerModuleImporte(row: ProgrammeImporteRow): ModuleProgramme {
  const duree = dureeDuProgramme(row);
  const semaines = Array.from({ length: duree }, (_, i) => i + 1);

  return {
    id: row.cle,
    /*
     * Ce que le programme sait servir. Pas de Nutrition ni de Mesures : le
     * document n'en prescrit pas. Progrès reste « à venir » tant que l'écran
     * Progrès n'est pas vérifié sur des exercices qui ne sont pas ceux de
     * POWER (incertitude de l'ADR).
     */
    onglets: [
      { route: 'today', label: 'Aujourd’hui', icon: 'play', vue: 'today' },
      { route: 'week', label: 'Semaine', icon: 'calendar', vue: 'week' },
      { route: 'progress', label: 'Progrès', icon: 'chart', vue: 'a-venir' },
      { route: 'settings', label: 'Réglages', icon: 'settings', vue: 'settings' },
    ],
    reglages: {
      eyebrow: `Programme ${String(duree)} semaine${duree > 1 ? 's' : ''}`,
      refPoids: null,
      force: false,
    },
    dureeSemaines: duree,
    semaines,
    joursDeLaSemaine(week: number) {
      const b = blocDe(row, week);
      return b === null ? [] : [...b.seances.map((s) => s.jour)].sort((a, b2) => a - b2);
    },
    blocDeLaSemaine(week: number) {
      return blocDe(row, week)?.libelle ?? null;
    },
    couleurDuBloc() {
      return 'transparent';
    },
    getSession(week: number, day: DayIndex, ctx: SessionContext): ResolvedSession | null {
      const b = blocDe(row, week);
      const seance = b?.seances.find((s) => s.jour === day) ?? null;
      if (b === null || seance === null) return null;
      return {
        week,
        day,
        block: 'accumulation',
        blockName: b.libelle ?? '',
        ...(b.libelle === null ? { sansBloc: true as const } : {}),
        blockColor: 'transparent',
        title: seance.titre,
        durationLabel: seance.dureeMinutes === null ? '' : `${String(seance.dureeMinutes)} min`,
        plannedMin: seance.dureeMinutes ?? 0,
        ...(seance.dureeMinutes === null ? { sansDuree: true as const } : {}),
        // Le type exige une intensité ; le document n'en donne pas : l'écran la tait.
        intensity: 'MODÉRÉ',
        sansIntensite: true,
        warmup: null,
        readinessTest: false,
        // Les consignes générales du document en tête de CHAQUE séance, puis celles de la séance.
        notes: [...row.document.consignes, ...seance.notes],
        exercises: seance.lignes.map((l) => exerciceDe(row, seance, l, ctx)),
        suspended: [],
        adjustments: [],
      };
    },
  };
}
