/**
 * « Votre plan alimentaire » — le questionnaire du site, dans l'appli
 * (demande de Guillaume, 23 novembre : une appli, pas dix liens).
 *
 * Mêmes écrans, mêmes questions, mêmes messages, même résumé envoyé :
 * profil en quatre écrans, cinq catégories d'aliments, récapitulatif, envoi
 * au coach. Tout le texte vient de `data/questionnairePlanAlimentaire.ts`,
 * la logique de `engine/questionnairePlanAlimentaire.ts` ; les deux sont
 * vérifiés contre le site d'origine.
 *
 * Ce que l'appli ajoute, et seulement à la fin : reprendre les aliments
 * choisis dans « Mon plan ». Rien n'est écrit en base avant ce geste.
 */

import { useEffect, useState } from 'react';
import {
  AIDES_NOMBRES,
  CATEGORIES,
  CHAPEAUX_PROFIL,
  CONSIGNE_ALIMENTS,
  ENVOI,
  ETAPES_PROFIL,
  EXEMPLE_ALLERGIES,
  NOMBRES,
  NOTE_SECURITE,
  OPTIONS,
  QUESTIONS,
  TEXTES,
  TITRES_PROFIL,
  phraseRetenus,
  type CleChoix,
  type CleNombre,
  type CleProfil,
  type EtapeProfil,
} from '../data/questionnairePlanAlimentaire';
import { getSettingsRow, saveSettings } from '../db/repo';
import {
  ajouter,
  ajoutesHorsPlan,
  alerteSecurite,
  alimentsDe,
  alimentsPourMonPlan,
  basculer,
  erreursDe,
  etapePrecedente,
  etapeSuivante,
  etatVide,
  faitDuSport,
  estFemme,
  lignesProfil,
  phraseErreurs,
  reinitialiser,
  resume,
  toutChoisir,
  type Etape,
  type EtatQuestionnaire,
} from '../engine/questionnairePlanAlimentaire';
import { ecrireQuestionnaire, lireQuestionnaire } from '../state/questionnairePlan';
import q from './Questionnaire.module.css';

const TOUTES = [...ETAPES_PROFIL, ...CATEGORIES.map((_, i) => i)] as Etape[];

export function QuestionnairePlanScreen({ onRetour }: { onRetour: () => void }) {
  const [etat, setEtat] = useState<EtatQuestionnaire>(lireQuestionnaire);
  const [erreurs, setErreurs] = useState<Partial<Record<CleProfil, string>>>({});

  function changer(e: EtatQuestionnaire) {
    setEtat(e);
    ecrireQuestionnaire(e);
  }
  function aller(step: Etape) {
    setErreurs({});
    changer({ ...etat, step });
    window.scrollTo(0, 0);
  }

  const step = etat.step;
  return (
    <div className={q.ecran}>
      <Barre etat={etat} />
      {step === 'intro' && <Intro onCommencer={() => aller('p0')} onRetour={onRetour} />}
      {typeof step === 'string' && (ETAPES_PROFIL as readonly string[]).includes(step) && (
        <EcranProfil
          etape={step as EtapeProfil}
          etat={etat}
          erreurs={erreurs}
          onChange={changer}
          onPrecedent={() => aller(etapePrecedente(step))}
          onContinuer={() => {
            const e = erreursDe(step as EtapeProfil, etat.profile);
            if (Object.keys(e).length === 0) aller(etapeSuivante(step));
            else {
              setErreurs(e);
              setTimeout(() => {
                const premier = document.querySelector('[data-erreur="1"]');
                premier?.scrollIntoView({ block: 'center' });
              }, 0);
            }
          }}
        />
      )}
      {typeof step === 'number' && (
        <EcranAliments
          index={step}
          etat={etat}
          onChange={changer}
          onPrecedent={() => aller(etapePrecedente(step))}
          onContinuer={() => aller(etapeSuivante(step))}
        />
      )}
      {step === 'recap' && (
        <Recap
          etat={etat}
          onAller={aller}
          onRecommencer={() => {
            if (!window.confirm(TEXTES.recommencerConfirmer)) return;
            changer(etatVide());
          }}
        />
      )}
      {step === 'done' && <Fin etat={etat} onModifier={() => aller('recap')} onRetour={onRetour} />}
    </div>
  );
}

// ----------------------------------------------------------------- barre --

function Barre({ etat }: { etat: EtatQuestionnaire }) {
  const idx = TOUTES.indexOf(etat.step);
  const dansEtapes = idx >= 0;
  if (!dansEtapes && etat.step !== 'recap') return null;
  const n = etat.selected.length;
  const nom = !dansEtapes
    ? 'Récapitulatif'
    : typeof etat.step === 'number'
      ? CATEGORIES[etat.step]!.label
      : TITRES_PROFIL[etat.step as EtapeProfil];
  const aliments = typeof etat.step === 'number' || !dansEtapes;
  return (
    <div className={q.barre}>
      <div className={q.barreTexte}>
        <span>{dansEtapes ? `Étape ${idx + 1}/${TOUTES.length} · ${nom}` : nom}</span>
        {aliments && (
          <span>
            <b>{n}</b>
            {n > 1 ? ' aliments' : ' aliment'}
          </span>
        )}
      </div>
      <div className={q.jauge}>
        <div
          className={q.jaugePleine}
          style={{ width: `${dansEtapes ? ((idx + 1) / TOUTES.length) * 100 : 100}%` }}
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- intro --

function Intro({ onCommencer, onRetour }: { onCommencer: () => void; onRetour: () => void }) {
  return (
    <div>
      <h1 className={q.titre}>{TEXTES.introTitre}</h1>
      <p className={q.chapeau}>{TEXTES.intro1}</p>
      <p className={q.chapeau}>{TEXTES.intro2}</p>
      <div className={q.nav}>
        <button type="button" className={q.fantome} onClick={onRetour}>
          Retour
        </button>
        <button type="button" className={q.principal} onClick={onCommencer}>
          {TEXTES.commencer}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- profil --

function Champ({
  cle,
  titre,
  facultatif,
  aide,
  erreur,
  children,
}: {
  cle: string;
  titre: string;
  facultatif?: boolean;
  aide?: string | undefined;
  erreur?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className={`${q.champ} ${erreur ? q.champErreur : ''}`} data-erreur={erreur ? '1' : '0'}>
      <span className={q.libelle} id={`l-${cle}`}>
        {titre}
        {facultatif && <span className={q.facultatif}>{TEXTES.facultatif}</span>}
      </span>
      {aide && <span className={q.aide}>{aide}</span>}
      {children}
      {erreur && (
        <p className={q.erreur} role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}

function EcranProfil({
  etape,
  etat,
  erreurs,
  onChange,
  onPrecedent,
  onContinuer,
}: {
  etape: EtapeProfil;
  etat: EtatQuestionnaire;
  erreurs: Partial<Record<CleProfil, string>>;
  onChange: (e: EtatQuestionnaire) => void;
  onPrecedent: () => void;
  onContinuer: () => void;
}) {
  const p = etat.profile;
  const poser = (cle: CleProfil, v: string | string[] | null) =>
    onChange({ ...etat, profile: { ...p, [cle]: v } });

  const nombreChamp = (cle: CleNombre, facultatif = false) => {
    const d = NOMBRES[cle];
    return (
      <Champ
        key={cle}
        cle={cle}
        titre={d.label}
        facultatif={facultatif}
        aide={AIDES_NOMBRES[cle]}
        erreur={erreurs[cle]}
      >
        <div className={q.ligneNombre}>
          <input
            className={q.nombre}
            type="text"
            inputMode={d.int ? 'numeric' : 'decimal'}
            autoComplete="off"
            maxLength={6}
            aria-labelledby={`l-${cle}`}
            value={p[cle] ?? ''}
            onChange={(e) => poser(cle, e.target.value.trim())}
          />
          <span className={q.unite}>{d.unit}</span>
        </div>
      </Champ>
    );
  };

  const choixChamp = (cle: CleChoix) => {
    const question = QUESTIONS[cle];
    const actuel = p[cle];
    return (
      <Champ key={cle} cle={cle} titre={question.titre} aide={question.aide} erreur={erreurs[cle]}>
        <div className={q.puces} role="group" aria-labelledby={`l-${cle}`}>
          {OPTIONS[cle].map(([v, l]) => {
            const on = question.multi ? (actuel as string[]).includes(v) : actuel === v;
            return (
              <button
                key={v}
                type="button"
                className={`${q.puce} ${on ? q.puceOn : ''}`}
                aria-pressed={on}
                onClick={() => {
                  if (question.multi) {
                    const l2 = actuel as string[];
                    poser(cle, on ? l2.filter((x) => x !== v) : [...l2, v]);
                  } else poser(cle, on ? null : v);
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
      </Champ>
    );
  };

  let corps: React.ReactNode[];
  if (etape === 'p0') {
    corps = [
      choixChamp('sex'),
      nombreChamp('age'),
      nombreChamp('height'),
      nombreChamp('weight'),
      nombreChamp('waist', true),
    ];
  } else if (etape === 'p1') {
    corps = [
      choixChamp('job'),
      choixChamp('steps'),
      choixChamp('sessions'),
      faitDuSport(p) ? choixChamp('duration') : null,
      faitDuSport(p) ? choixChamp('sportType') : null,
    ];
  } else if (etape === 'p2') {
    corps = [
      choixChamp('goal'),
      p.goal && p.goal !== 'maintien' ? choixChamp('pace') : null,
      choixChamp('trend'),
      nombreChamp('weight4w', true),
    ];
  } else {
    corps = [
      estFemme(p) ? choixChamp('pregnant') : null,
      choixChamp('medical'),
      choixChamp('eating'),
      <Champ key="allergies" cle="allergies" titre={QUESTIONS.allergies.titre} facultatif>
        <input
          className={q.texte}
          type="text"
          maxLength={120}
          autoComplete="off"
          aria-labelledby="l-allergies"
          placeholder={EXEMPLE_ALLERGIES}
          value={p.allergies ?? ''}
          onChange={(e) => poser('allergies', e.target.value)}
        />
      </Champ>,
      alerteSecurite(p) ? (
        <p key="note" className={q.note}>
          {NOTE_SECURITE}
        </p>
      ) : null,
    ];
  }
  const resteAFaire = phraseErreurs(Object.keys(erreurs).length);
  return (
    <div>
      <h2 className={q.titre}>{TITRES_PROFIL[etape]}</h2>
      <p className={q.chapeau}>{CHAPEAUX_PROFIL[etape]}</p>
      <div className={q.feuille}>{corps}</div>
      {resteAFaire && <p className={q.erreur}>{resteAFaire}</p>}
      <div className={q.nav}>
        <button type="button" className={q.fantome} onClick={onPrecedent}>
          {TEXTES.precedent}
        </button>
        <button type="button" className={q.principal} onClick={onContinuer}>
          {TEXTES.continuer}
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- aliments --

function EcranAliments({
  index,
  etat,
  onChange,
  onPrecedent,
  onContinuer,
}: {
  index: number;
  etat: EtatQuestionnaire;
  onChange: (e: EtatQuestionnaire) => void;
  onPrecedent: () => void;
  onContinuer: () => void;
}) {
  const cat = CATEGORIES[index]!;
  const aliments = alimentsDe(etat, cat.id);
  const tous = aliments.every((f) => etat.selected.includes(f.id));
  const [ajout, setAjout] = useState<string | null>(null);
  const derniere = index === CATEGORIES.length - 1;
  return (
    <div>
      <h2 className={q.titre}>{cat.label}</h2>
      <div className={q.feuille}>
        <span className={q.aide}>{CONSIGNE_ALIMENTS}</span>
        <div className={q.outils}>
          <button
            type="button"
            className={q.outil}
            onClick={() => onChange(tous ? reinitialiser(etat, cat.id) : toutChoisir(etat, cat.id))}
          >
            {tous ? TEXTES.toutDeselectionner : TEXTES.toutSelectionner}
          </button>
          <button
            type="button"
            className={q.outil}
            onClick={() => onChange(reinitialiser(etat, cat.id))}
          >
            {TEXTES.reinitialiser}
          </button>
        </div>
        <div className={q.aliments}>
          {aliments.map((f) => {
            const on = etat.selected.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                className={`${q.aliment} ${on ? q.alimentOn : ''}`}
                aria-pressed={on}
                onClick={() => onChange(basculer(etat, f.id))}
              >
                <span>{f.name}</span>
                <span className={q.coche} aria-hidden="true">
                  {on ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
        {ajout === null ? (
          <button type="button" className={q.ajouterOuvrir} onClick={() => setAjout('')}>
            {TEXTES.ajouterOuvrir}
          </button>
        ) : (
          <div>
            <div className={q.ligneAjout}>
              <input
                className={q.texte}
                type="text"
                maxLength={40}
                autoFocus
                autoComplete="off"
                placeholder={TEXTES.ajouterPlaceholder}
                aria-label="Nom de l'aliment à ajouter"
                value={ajout}
                onChange={(e) => setAjout(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onChange(ajouter(etat, cat.id, ajout));
                    setAjout(null);
                  }
                }}
              />
              <button
                type="button"
                className={q.principalCourt}
                onClick={() => {
                  onChange(ajouter(etat, cat.id, ajout));
                  setAjout(null);
                }}
              >
                {TEXTES.ajouter}
              </button>
            </div>
            <p className={q.aide}>{TEXTES.ajouterNote}</p>
          </div>
        )}
      </div>
      <div className={q.nav}>
        <button type="button" className={q.fantome} onClick={onPrecedent}>
          {TEXTES.precedent}
        </button>
        <button type="button" className={q.principal} onClick={onContinuer}>
          {derniere ? TEXTES.voirRecap : TEXTES.continuer}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------- récapitulatif --

function Recap({
  etat,
  onAller,
  onRecommencer,
}: {
  etat: EtatQuestionnaire;
  onAller: (s: Etape) => void;
  onRecommencer: () => void;
}) {
  return (
    <div>
      <h2 className={q.titre}>{TEXTES.recapTitre}</h2>
      <p className={q.chapeau}>{TEXTES.recapChapeau}</p>
      <div className={q.feuille}>
        <section className={q.rec}>
          <div className={q.recTete}>
            <h3>{TEXTES.votreProfil}</h3>
            <button
              type="button"
              onClick={() => onAller('p0')}
              aria-label="Modifier : votre profil"
            >
              {TEXTES.modifier}
            </button>
          </div>
          <div className={q.pilules}>
            {lignesProfil(etat.profile)
              .slice(0, 6)
              .map(([k, v]) => (
                <span key={k} className={q.pilule}>
                  {v}
                </span>
              ))}
          </div>
        </section>
        {CATEGORIES.map((cat, i) => {
          const liste = alimentsDe(etat, cat.id).filter((f) => etat.selected.includes(f.id));
          return (
            <section key={cat.id} className={q.rec}>
              <div className={q.recTete}>
                <h3>
                  {cat.label}
                  <span className={q.compte}>
                    {liste.length === 0 ? TEXTES.aucun : String(liste.length)}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => onAller(i)}
                  aria-label={`Modifier : ${cat.label}`}
                >
                  {TEXTES.modifier}
                </button>
              </div>
              {liste.length ? (
                <div className={q.pilules}>
                  {liste.map((f) => (
                    <span key={f.id} className={q.pilule}>
                      {f.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={q.vide}>{TEXTES.aucunAliment}</p>
              )}
            </section>
          );
        })}
      </div>
      <div className={q.nav}>
        <button type="button" className={q.fantome} onClick={() => onAller(CATEGORIES.length - 1)}>
          {TEXTES.precedent}
        </button>
        <button type="button" className={q.principal} onClick={() => onAller('done')}>
          {TEXTES.valider}
        </button>
      </div>
      <div className={q.nav}>
        <button type="button" className={q.fantome} style={{ flex: 1 }} onClick={onRecommencer}>
          {TEXTES.recommencer}
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- fin --

function Fin({
  etat,
  onModifier,
  onRetour,
}: {
  etat: EtatQuestionnaire;
  onModifier: () => void;
  onRetour: () => void;
}) {
  const texte = resume(etat);
  const [statut, setStatut] = useState('');
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte);
      setStatut(TEXTES.copie);
    } catch {
      setStatut(TEXTES.copieManuelle);
    }
  };
  return (
    <div>
      <h1 className={q.titre}>{TEXTES.finTitre}</h1>
      <p className={q.chapeau}>{phraseRetenus(etat.selected.length)}</p>
      <p className={q.chapeau}>{TEXTES.fin2}</p>
      <textarea className={q.resume} readOnly aria-label="Résumé de vos réponses" value={texte} />
      <div className={q.actions}>
        <a
          className={q.principal}
          href={`https://wa.me/${ENVOI.whatsapp}?text=${encodeURIComponent(ENVOI.message)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void copier()}
        >
          {TEXTES.envoyerWhatsapp}
        </a>
        <a
          className={q.secondaire}
          href={`mailto:${ENVOI.email}?subject=${encodeURIComponent(ENVOI.sujet)}&body=${encodeURIComponent(ENVOI.message)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void copier()}
        >
          {TEXTES.envoyerEmail}
        </a>
        <button type="button" className={q.secondaire} onClick={() => void copier()}>
          {TEXTES.copierSeulement}
        </button>
        <p className={q.statut} role="status" aria-live="polite">
          {statut}
        </p>
      </div>
      <DansMonPlan etat={etat} />
      <div className={q.nav}>
        <button type="button" className={q.fantome} onClick={onModifier}>
          {TEXTES.modifierReponses}
        </button>
        <button type="button" className={q.fantome} onClick={onRetour}>
          Retour à Nutrition
        </button>
      </div>
    </div>
  );
}

/**
 * Le seul geste propre à l'appli : reprendre les aliments choisis dans
 * « Mon plan ». Rien ne s'écrit sans ce bouton, et une liste déjà là est
 * annoncée avant d'être remplacée.
 */
export function DansMonPlan({ etat }: { etat: EtatQuestionnaire }) {
  const aReprendre = alimentsPourMonPlan(etat);
  const horsPlan = ajoutesHorsPlan(etat);
  const [actuels, setActuels] = useState<string[] | null>(null);
  const [fait, setFait] = useState(false);
  useEffect(() => {
    void getSettingsRow().then((r) => setActuels(r.alimentsPreferes ?? []));
  }, [fait]);
  if (aReprendre.length === 0) return null;
  const memes =
    actuels !== null &&
    actuels.length === aReprendre.length &&
    aReprendre.every((id) => actuels.includes(id));
  return (
    <section className={q.monPlan} aria-label="Dans l'appli">
      <h3 className={q.monPlanTitre}>Dans l’appli</h3>
      {fait || memes ? (
        <p className={q.chapeau}>
          Tes {aReprendre.length} aliments sont dans « Mon plan », onglet Nutrition.
        </p>
      ) : (
        <>
          <p className={q.chapeau}>
            Reprends ces {aReprendre.length} aliments dans « Mon plan » : tes cinq repas s’ouvriront
            avec ta liste à toi.
            {actuels !== null &&
              actuels.length > 0 &&
              ` Ils remplaceront ta liste actuelle (${actuels.length} aliment${actuels.length > 1 ? 's' : ''}).`}
          </p>
          <button
            type="button"
            className={q.principal}
            onClick={() =>
              void (async () => {
                await saveSettings({ alimentsPreferes: aReprendre });
                setFait(true);
              })()
            }
          >
            Utiliser ces {aReprendre.length} aliments dans Mon plan
          </button>
        </>
      )}
      {horsPlan > 0 && (
        <p className={q.aide}>
          {horsPlan > 1
            ? `${horsPlan} aliments ajoutés à la main restent dans le résumé seulement : sans valeurs, l’appli ne saurait pas les compter.`
            : '1 aliment ajouté à la main reste dans le résumé seulement : sans valeurs, l’appli ne saurait pas le compter.'}
        </p>
      )}
    </section>
  );
}
