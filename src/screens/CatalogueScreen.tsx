/**
 * Le catalogue : les trois familles, et ce qui est réellement jouable.
 *
 * ── La règle d'affichage ───────────────────────────────────────────────────
 *
 * Un programme `a-venir` n'a pas de bouton. Pas un bouton grisé : pas de
 * bouton du tout. Un bouton désactivé invite quand même à appuyer, et laisse
 * croire qu'il suffirait d'attendre un instant. Une mention « à venir » dit la
 * vérité sans rien promettre.
 *
 * ── Ce que fait le bouton, selon ce qui existe déjà ────────────────────────
 *
 * - un cycle en cours sur ce programme → « Reprendre », qui ouvre la séance ;
 * - aucun cycle → « Commencer », qui en crée un ;
 * - uniquement des cycles terminés → « Recommencer », avec confirmation.
 *
 * Le troisième cas demande confirmation parce qu'il change ce que
 * l'application montre : on sort du cycle regardé pour en ouvrir un neuf, vide.
 * Rien n'est effacé — l'ancien garde tout — mais l'écran change du tout au
 * tout, et une surprise pareille doit être demandée.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { Icon } from '../components/Icon';
import { EnTetePlateforme } from '../components/EnTetePlateforme';
import { Visuel } from '../components/Visuel';
import { HABILLAGE } from '../data/famillesVisuel';
import { FAMILLES, type FamilleId, type ProgrammeDefinition } from '../data/catalogue';
import type { CycleRow } from '../db/db';
import { activerCycle, demarrerCycle, tousLesCycles } from '../db/repo';
import styles from './Screens.module.css';
import local from './Catalogue.module.css';

/** Ce que l'utilisateur peut faire d'un programme, ici et maintenant. */
type Action = 'reprendre' | 'commencer' | 'recommencer' | 'aucune';

function actionPour(programme: ProgrammeDefinition, cycles: CycleRow[]): Action {
  if (programme.statut !== 'disponible') return 'aucune';
  const siens = cycles.filter((c) => c.programmeId === programme.id);
  if (siens.some((c) => c.statut !== 'termine')) return 'reprendre';
  return siens.length === 0 ? 'commencer' : 'recommencer';
}

const LIBELLE: Record<Action, string> = {
  reprendre: 'Reprendre',
  commencer: 'Commencer le programme',
  recommencer: 'Recommencer ce programme',
  aucune: '',
};

export function CatalogueScreen({
  onOuvrirProgramme,
  onDataChanged,
}: {
  onOuvrirProgramme: () => void;
  onDataChanged: () => void;
}) {
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [deplie, setDeplie] = useState<string | null>(null);
  /**
   * La famille dépliée, ou `null`.
   *
   * Une seule à la fois : les trois bannières doivent rester visibles d'un
   * coup d'œil, ce qui est la raison d'être de cet écran. Ouvrir POWER ferme
   * donc MASS.
   */
  const [familleOuverte, setFamilleOuverte] = useState<FamilleId | null>(null);
  const [aConfirmer, setAConfirmer] = useState<ProgrammeDefinition | null>(null);

  useEffect(() => {
    void tousLesCycles().then(setCycles);
  }, []);

  async function agir(programme: ProgrammeDefinition, action: Action) {
    if (action === 'aucune') return;

    if (action === 'reprendre') {
      const sien = cycles.find((c) => c.programmeId === programme.id && c.statut !== 'termine');
      if (sien?.id !== undefined) await activerCycle(sien.id);
      onDataChanged();
      onOuvrirProgramme();
      return;
    }

    if (action === 'recommencer' && aConfirmer?.id !== programme.id) {
      setAConfirmer(programme);
      return;
    }

    /*
     * Un cycle neuf part sans date : c'est l'écran Réglages qui la pose, comme
     * pour le tout premier. Inventer « aujourd'hui » poserait un calendrier
     * que personne n'a choisi.
     */
    await demarrerCycle({
      programmeId: programme.id,
      programmeVersion: programme.version,
      startDate: '',
    });
    setAConfirmer(null);
    onDataChanged();
    onOuvrirProgramme();
  }

  return (
    <div className={styles.screen}>
      <EnTetePlateforme />

      <div className={local.titreEcran}>
        <h1 className={local.grandTitre}>Choisis ton programme</h1>
        <p className={local.sousTitreEcran}>
          <span className={local.trait} aria-hidden="true" />
          Un programme adapté à ton objectif
        </p>
      </div>

      {FAMILLES.map((famille) => (
        <section
          key={famille.id}
          className={local.famille}
          style={{ '--teinte': HABILLAGE[famille.id].teinte } as CSSProperties}
        >
          {/*
            La bannière est un bouton : elle déplie la famille sur ses
            programmes, qui restent exactement ceux du catalogue. La maquette
            montre un chevron, et c'est bien ce qu'il fait — ouvrir la famille,
            pas naviguer vers un écran de plus.
          */}
          <button
            type="button"
            className={local.banniere}
            onClick={() => setFamilleOuverte(familleOuverte === famille.id ? null : famille.id)}
            aria-expanded={familleOuverte === famille.id}
          >
            {HABILLAGE[famille.id].photo !== undefined && (
              <span className={local.bannierePhoto} aria-hidden="true">
                <Visuel nom={HABILLAGE[famille.id].photo!} sizes="100vw" />
              </span>
            )}
            <span className={local.banniereVoile} aria-hidden="true" />
            {famille.programmes.every((p) => p.statut === 'a-venir') && (
              <span className={local.banniereBadge}>À venir</span>
            )}
            <span className={local.banniereTexte}>
              <span className={local.nomFamille}>{famille.nom}</span>
              <span className={local.sousTitre}>{famille.sousTitre}</span>
              <span className={local.barres} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </span>
            <span className={local.banniereChevron} aria-hidden="true">
              <Icon
                name={familleOuverte === famille.id ? 'chevron-up' : 'arrow-right'}
                size="18px"
              />
            </span>
          </button>

          {familleOuverte === famille.id && (
            <div className={local.corpsFamille}>
              <p className={styles.cardSub}>{famille.resume}</p>

              {famille.programmes.length === 0 && (
                <p className={local.rien}>Aucun programme pour l’instant.</p>
              )}

              <ul className={local.liste}>
                {famille.programmes.map((p) => {
                  const action = actionPour(p, cycles);
                  const ouvert = deplie === p.id;
                  return (
                    <li key={p.id} className={local.ligne}>
                      <button
                        type="button"
                        className={local.titreLigne}
                        onClick={() => setDeplie(ouvert ? null : p.id)}
                        aria-expanded={ouvert}
                      >
                        <span className={local.nom}>{p.nom}</span>
                        <span className={local.duree}>{p.dureeSemaines} semaines</span>
                        <span
                          className={`${local.etat} ${p.statut === 'disponible' ? local.dispo : ''}`}
                        >
                          {p.statut === 'disponible' ? 'Disponible' : 'À venir'}
                        </span>
                        <Icon name={ouvert ? 'chevron-up' : 'chevron-down'} size="16px" />
                      </button>

                      {ouvert && (
                        <div className={local.details}>
                          <p className={local.resume}>{p.resume}</p>

                          {p.objectifs.length > 0 && (
                            <>
                              <h3 className={local.sousSection}>Objectifs</h3>
                              <ul className={local.puces}>
                                {p.objectifs.map((o) => (
                                  <li key={o}>{o}</li>
                                ))}
                              </ul>
                            </>
                          )}

                          {p.prerequis.length > 0 && (
                            <>
                              <h3 className={local.sousSection}>Prérequis</h3>
                              <ul className={local.puces}>
                                {p.prerequis.map((o) => (
                                  <li key={o}>{o}</li>
                                ))}
                              </ul>
                            </>
                          )}

                          {action !== 'aucune' && aConfirmer?.id !== p.id && (
                            <button
                              type="button"
                              className={local.action}
                              onClick={() => void agir(p, action)}
                            >
                              {LIBELLE[action]}
                            </button>
                          )}

                          {aConfirmer?.id === p.id && (
                            <div className={local.confirme}>
                              <p>
                                Un nouveau cycle s’ouvrira, vide. Ton cycle précédent garde toutes
                                ses séances et toutes ses charges — il reste consultable.
                              </p>
                              <div className={local.boutons}>
                                <button
                                  type="button"
                                  className={local.action}
                                  onClick={() => void agir(p, 'recommencer')}
                                >
                                  Ouvrir un nouveau cycle
                                </button>
                                <button
                                  type="button"
                                  className={local.annuler}
                                  onClick={() => setAConfirmer(null)}
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          )}

                          {action === 'aucune' && (
                            <p className={local.rien}>
                              Ce programme n’est pas encore jouable dans l’application.
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
