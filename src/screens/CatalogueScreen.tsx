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

import { accesProgramme } from '../engine/acces';
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
  familleOuverte: familleDemandee,
  onOuvrirProgramme,
  onDataChanged,
}: {
  /** La famille à ouvrir d'emblée — celle de la tuile touchée à l'accueil. */
  familleOuverte?: FamilleId;
  onOuvrirProgramme: () => void;
  onDataChanged: () => void;
}) {
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [deplie, setDeplie] = useState<string | null>(null);
  /*
   * La liste du matériel est REPLIÉE par défaut : cinq objets détaillés
   * prenaient tout l'écran et repoussaient le bouton « Commencer » sous le
   * pli. Le titre dit combien il y en a ; un appui les déplie.
   */
  const [materielOuvert, setMaterielOuvert] = useState(false);
  /**
   * La famille dépliée, ou `null`.
   *
   * Une seule à la fois : les trois bannières doivent rester visibles d'un
   * coup d'œil, ce qui est la raison d'être de cet écran. Ouvrir POWER ferme
   * donc MASS.
   */
  const [familleOuverte, setFamilleOuverte] = useState<FamilleId | null>(familleDemandee ?? null);

  /*
   * Arrivé depuis une tuile de l'accueil : la famille est dépliée, et on la
   * fait venir en haut de l'écran — sinon FEMMES, troisième bannière, ouvrait
   * ses cycles sous le pli.
   */
  useEffect(() => {
    if (familleDemandee === undefined) return;
    document
      .getElementById(`famille-${familleDemandee}`)
      ?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [familleDemandee]);
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
          id={`famille-${famille.id}`}
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
              {famille.sousTitre && <span className={local.sousTitre}>{famille.sousTitre}</span>}
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

              {/* L'ordre conseillé se DIT, pour qu'un numéro ne se lise pas
                  comme un verrou : chacun se démarre librement. */}
              {famille.ordreConseille && (
                <p className={local.ordreConseille}>Ordre conseillé, pas obligatoire</p>
              )}

              <ul className={local.liste}>
                {famille.programmes.map((p, rang) => {
                  const action = actionPour(p, cycles);
                  const ouvert = deplie === p.id;
                  /*
                   * Une famille en PARCOURS (POWER : six étapes sur 52
                   * semaines) numérote ses étapes et montre, sur chaque
                   * ligne, si elle est ouverte ou ce qui la débloque —
                   * comme le schéma de Guillaume. Les autres familles
                   * gardent leur liste simple.
                   */
                  const enParcours = famille.programmes.some((x) => x.deblocage);
                  const acces = enParcours ? accesProgramme(p, cycles) : null;
                  return (
                    <li key={p.id} className={local.ligne}>
                      <button
                        type="button"
                        className={local.titreLigne}
                        onClick={() => setDeplie(ouvert ? null : p.id)}
                        aria-expanded={ouvert}
                      >
                        {(enParcours || famille.ordreConseille) && (
                          <span className={local.etape}>{rang + 1}</span>
                        )}
                        {/* Dans la famille, son nom est déjà dit : « CYCLE 1 » plutôt
                            que « POWER CYCLE 1 », qui passait sur deux lignes. */}
                        {/* Nom et durée ensemble : si la ligne manque de place,
                            la durée passe dessous au lieu de couper le nom
                            (« TRANSITION / 2 » à 375 px). */}
                        <span className={local.nomDuree}>
                          <span className={local.nom}>
                            {p.nom.startsWith(`${famille.nom} `)
                              ? p.nom.slice(famille.nom.length + 1)
                              : p.nom}
                          </span>
                          <span className={local.duree}>{p.dureeSemaines} semaines</span>
                        </span>
                        <span
                          className={`${local.etat} ${p.statut === 'disponible' ? local.dispo : ''}`}
                        >
                          {p.statut === 'disponible' ? 'Disponible' : 'À venir'}
                        </span>
                        <Icon name={ouvert ? 'chevron-up' : 'chevron-down'} size="16px" />
                      </button>
                      {acces && (
                        <p className={`${local.badge} ${acces.ouvert ? local.badgeOuvert : ''}`}>
                          <span aria-hidden="true">{acces.ouvert ? '✓' : '🔒'}</span>
                          {acces.badge}
                        </p>
                      )}

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

                          {p.materiel && p.materiel.length > 0 && (
                            /*
                             * Le matériel à prévoir, AVANT de démarrer : de
                             * quoi acheter une ceinture de lest à temps plutôt
                             * que de la découvrir en semaine 1.
                             */
                            <div className={local.materielBloc}>
                              <button
                                type="button"
                                className={local.materielTete}
                                onClick={() => setMaterielOuvert((v) => !v)}
                                aria-expanded={materielOuvert}
                              >
                                <span>Matériel à prévoir</span>
                                <span className={local.materielCompte}>
                                  {p.materiel.length} objets
                                </span>
                                <Icon
                                  name={materielOuvert ? 'chevron-up' : 'chevron-down'}
                                  size="16px"
                                />
                              </button>
                              {materielOuvert && (
                                <ul className={local.materiel}>
                                  {p.materiel.map((m) => (
                                    <li key={m.objet}>
                                      <b>{m.objet}</b>
                                      <span>{m.usage}</span>
                                      {m.sinon && (
                                        <span className={local.sinon}>Sinon : {m.sinon}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
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

                          {/* Le combiné d'évaluation : il se fait AVANT le
                              programme, et reste accessible même quand le
                              programme est encore à venir. */}
                          {p.combineAvant && (
                            <>
                              <button
                                type="button"
                                className={local.action}
                                onClick={() => {
                                  window.location.hash = '#/evaluation';
                                }}
                              >
                                Combiné d’évaluation
                              </button>
                              <p className={local.resume}>
                                {p.nom} démarre après ce combiné : développé couché, tirage
                                vertical, squat, push press.
                              </p>
                            </>
                          )}

                          {action === 'aucune' && p.apercu !== undefined && (
                            /*
                              L'aperçu ouvre les écrans en lecture seule. Il ne
                              crée aucun cycle : c'est pour regarder, pas pour
                              démarrer, et la phrase le dit.
                            */
                            <>
                              <button
                                type="button"
                                className={local.action}
                                onClick={() => {
                                  window.location.hash = p.apercu!;
                                }}
                              >
                                Voir l’aperçu
                              </button>
                              <p className={local.rien}>
                                Aperçu : rien n’est encore enregistré. Ce programme n’est pas encore
                                jouable dans l’application.
                              </p>
                            </>
                          )}

                          {action === 'aucune' && p.apercu === undefined && (
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
