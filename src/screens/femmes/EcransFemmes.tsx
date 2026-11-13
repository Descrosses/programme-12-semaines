/**
 * Le point d'entrée des écrans FEMMES : il détient le cycle et fait les
 * écritures.
 *
 * ── Ce qui vit où ─────────────────────────────────────────────────────────
 *
 * - En BASE : le profil de départ (niveau, deux réponses de sécurité), posé
 *   sur la ligne du cycle, et les séances faites (`femmesSeances`).
 * - En MÉMOIRE : ce qu'on regarde — semaine, jour, maison ou salle, exercice
 *   ouvert. À l'ouverture, on se place sur la prochaine séance à faire.
 *
 * Tant que le profil n'est pas rempli, seul l'écran de départ s'affiche :
 * aucune séance ne s'ouvre sans les deux réponses de sécurité.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CycleRow, FemmesSeanceRow } from '../../db/db';
import {
  FEMMES_PROGRAMME_ID,
  enregistrerProfilFemmes,
  majSeanceFemmes,
  marquerSeanceFemmesNonFaite,
  modifierExerciceFemmes,
  rouvrirSeanceFemmes,
  seancesFemmes,
  terminerSeanceFemmes,
} from '../../db/femmesRepo';
import { cycleActif } from '../../db/repo';
import { avancement, historique } from '../../engine/femmes/avancement';
import { DEFAULT_SETTINGS, type SessionContext } from '../../engine/femmes/types';
import { appliquerNote, appliquerTour, type ContexteTour } from '../../engine/femmes/tours';
import type { ResolvedSlot } from '../../data/femmes/types';
import type { RestTimer } from '../../state/useRestTimer';
import { SeanceFemmes } from './SeanceFemmes';
import { applique } from './etat';
import {
  ETAT_INITIAL,
  FemmesAujourdhui,
  FemmesProfil,
  FemmesSemaine,
  type DonneesFemmes,
  type EtatFemmes,
  type ProfilSaisi,
} from './FemmesScreens';
import type { OngletFemmes } from './Pieces';
import s from './Femmes.module.css';

export type VueFemmes = 'aujourdhui' | 'semaine' | 'seance' | 'exercice' | 'securite';

export function EcransFemmes({
  vue,
  onNaviguer,
  onSortir,
  onDataChanged,
  timer,
}: {
  vue: VueFemmes;
  /** Le chrono de repos de l'App, le même que POWER : la barre du bas l'affiche. */
  timer: RestTimer;
  onNaviguer: (v: VueFemmes) => void;
  /*
   * La sortie du programme, vers l'accueil MAJK — le bouton « MAJK » de la
   * barre du bas.
   */
  onSortir: () => void;
  /** Prévient l'App qu'un cycle vient de se terminer. */
  onDataChanged: () => void;
}) {
  /* `undefined` : pas encore lu. `null` : pas de cycle FEMMES actif. */
  const [cycle, setCycle] = useState<CycleRow | null | undefined>(undefined);
  const [seances, setSeances] = useState<FemmesSeanceRow[]>([]);
  const [etat, setEtat] = useState<EtatFemmes>(ETAT_INITIAL);

  const relire = useCallback(async () => {
    const c = await cycleActif();
    if (c?.programmeId !== FEMMES_PROGRAMME_ID || c.id === undefined) {
      setCycle(null);
      return null;
    }
    const lignes = await seancesFemmes(c.id);
    setCycle(c);
    setSeances(lignes);
    return { c, lignes };
  }, []);

  /* À l'ouverture : on se place sur la prochaine séance à faire. */
  useEffect(() => {
    void relire().then((lu) => {
      if (!lu) return;
      const p = avancement(lu.lignes).prochaine;
      setEtat((e) => ({
        ...e,
        niveau: lu.c.femmes?.niveau ?? e.niveau,
        ...(p ? { semaine: p.semaine, jour: p.jour } : {}),
      }));
    });
  }, [relire]);

  const donnees: DonneesFemmes | null = useMemo(() => {
    if (!cycle) return null;
    const ctx: SessionContext = {
      settings: {
        ...DEFAULT_SETTINGS,
        safety: cycle.femmes?.safety ?? DEFAULT_SETTINGS.safety,
      },
      history: historique(seances),
    };
    return { ctx, seances, avance: avancement(seances), depuis: cycle.createdAt };
  }, [cycle, seances]);

  /* Les onglets du bas ne mènent qu'aux écrans qui existent ; les autres
     ramènent à Aujourd'hui plutôt que d'ouvrir une page vide. */
  const aller = (o: OngletFemmes) => {
    if (o === 'majk') onSortir();
    else if (o === 'semaine') onNaviguer('semaine');
    else if (o === 'reglages') onNaviguer('securite');
    else onNaviguer('aujourdhui');
  };

  if (cycle === undefined) return <div className={s.page} />;
  // Sans cycle FEMMES, l'App renvoie au catalogue : rien à afficher ici.
  if (cycle === null || cycle.id === undefined || donnees === null) {
    return <div className={s.page} />;
  }
  const cycleId = cycle.id;

  async function enregistrerProfil(p: ProfilSaisi) {
    await enregistrerProfilFemmes(cycleId, p);
    setEtat((e) => applique(e, { niveau: p.niveau }));
    await relire();
  }

  // Le départ : obligatoire tant que le profil n'existe pas.
  if (cycle.femmes === undefined) {
    return (
      <FemmesProfil
        initial={null}
        depart
        onValider={async (p) => {
          await enregistrerProfil(p);
          onNaviguer('aujourdhui');
        }}
        onAller={aller}
      />
    );
  }

  /* La séance ouverte, telle que la base la désigne. */
  const cible = { cycleId, semaine: etat.semaine, jour: etat.jour, version: etat.version };
  const ctxTour = (slot: ResolvedSlot, planned: number): ContexteTour => ({
    exerciseId: slot.exercise.id,
    week: etat.semaine,
    day: etat.jour,
    date: new Date().toISOString().slice(0, 10),
    version: etat.version,
    planned,
  });
  const ligneOuverte = seances.find((x) => x.semaine === etat.semaine && x.jour === etat.jour);

  async function terminer() {
    const fin = await terminerSeanceFemmes({
      cycleId,
      semaine: etat.semaine,
      jour: etat.jour,
      version: etat.version,
    });
    const lu = await relire();
    // On passe à la séance suivante : c'est elle que montre Aujourd'hui.
    const p = lu ? avancement(lu.lignes).prochaine : null;
    if (p) setEtat((e) => applique(e, { semaine: p.semaine, jour: p.jour }));
    if (fin) onDataChanged();
    onNaviguer('aujourdhui');
  }

  /*
   * « Séance non faite » sur la séance ouverte. En la passant, on se place
   * sur la prochaine à faire et on revient à Aujourd'hui ; en annulant, on
   * reste sur la séance.
   */
  async function nonFaite(semaine: EtatFemmes['semaine'], jour: EtatFemmes['jour'], oui: boolean) {
    const fin = await marquerSeanceFemmesNonFaite({
      cycleId,
      semaine,
      jour,
      version: etat.version,
      nonFaite: oui,
    });
    const lu = await relire();
    if (fin) onDataChanged();
    if (!oui) return;
    const p = lu ? avancement(lu.lignes).prochaine : null;
    if (p) setEtat((e) => applique(e, { semaine: p.semaine, jour: p.jour }));
    onNaviguer('aujourdhui');
  }

  if (vue === 'semaine') {
    return (
      <FemmesSemaine
        etat={etat}
        donnees={donnees}
        onSemaine={(w) => setEtat(applique(etat, { semaine: w }))}
        onJour={(d) => {
          setEtat(applique(etat, { jour: d }));
          onNaviguer('seance');
        }}
        onAller={aller}
      />
    );
  }
  /*
   * La séance, sur UN écran comme POWER. L'ancienne vue « exercice » (un
   * exercice en plein écran) y mène aussi : un lien gardé en favori ne tombe
   * pas sur une page vide.
   */
  if (vue === 'seance' || vue === 'exercice') {
    return (
      <SeanceFemmes
        etat={etat}
        donnees={donnees}
        timer={timer}
        actions={{
          onRetour: () => onNaviguer('semaine'),
          onVersion: (v) => setEtat(applique(etat, { version: v })),
          onDemarrer: async () => {
            await majSeanceFemmes({ ...cible, patch: { debut: Date.now() } });
            await relire();
          },
          onEchauffement: async (ids) => {
            await majSeanceFemmes({ ...cible, patch: { echauffement: ids } });
            await relire();
          },
          onTour: async (slot, i, tour, planned) => {
            // Le premier tour validé démarre la séance, comme la première
            // série validée démarre le chrono de POWER.
            if (ligneOuverte?.debut === undefined) {
              await majSeanceFemmes({ ...cible, patch: { debut: Date.now() } });
            }
            await modifierExerciceFemmes({
              ...cible,
              exerciseId: slot.exercise.id,
              modifier: (ancien) => appliquerTour(ancien, ctxTour(slot, planned), i, tour),
            });
            await relire();
          },
          onNote: async (slot, planned, patch) => {
            await modifierExerciceFemmes({
              ...cible,
              exerciseId: slot.exercise.id,
              modifier: (ancien) => appliquerNote(ancien, ctxTour(slot, planned), patch),
            });
            await relire();
          },
          onTerminer: async () => {
            timer.skip();
            await terminer();
          },
          onRouvrir: async () => {
            await rouvrirSeanceFemmes(cible);
            await relire();
          },
          onNonFaite: (oui) => void nonFaite(etat.semaine, etat.jour, oui),
        }}
      />
    );
  }
  if (vue === 'securite') {
    return (
      <FemmesProfil
        initial={cycle.femmes}
        depart={false}
        onValider={enregistrerProfil}
        onAller={aller}
      />
    );
  }

  return (
    <FemmesAujourdhui
      etat={etat}
      donnees={donnees}
      onAller={aller}
      onCommencer={() => onNaviguer('seance')}
      onNonFaite={() => void nonFaite(etat.semaine, etat.jour, true)}
    />
  );
}
