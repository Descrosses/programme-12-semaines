/**
 * « Bilan sportif et nutrition » — le questionnaire du site, dans l'appli
 * (Guillaume, 23 novembre : une appli, pas dix liens).
 *
 * Mêmes écrans, mêmes questions, mêmes messages, même résumé envoyé :
 * accueil (prénom, profil, situations, accord), sections selon le profil et
 * les situations, arrêt de sécurité, résumé et envoi au coach. Le texte vient
 * de `data/questionnaireBilanSportif.ts`, la logique de
 * `engine/questionnaireBilanSportif.ts` ; les deux sont vérifiés contre le
 * site d'origine.
 *
 * L'appli n'en tire RIEN : ni programme, ni charge, ni cible. Les réponses
 * restent sur le téléphone (localStorage) jusqu'à l'envoi.
 */

import { useState } from 'react';
import {
  ECHELLE,
  PROFILS,
  SITUATIONS,
  TEXTES,
  type QuestionBilan,
  type SectionBilan,
} from '../data/questionnaireBilanSportif';
import {
  arret,
  basculerChoix,
  basculerCoche,
  estVisible,
  etatVide,
  groupesVisibles,
  liensEnvoi,
  manquantes,
  resume,
  sectionsVisibles,
  type Arret,
  type EtatBilan,
} from '../engine/questionnaireBilanSportif';
import { TEXTES_ORIENTATION } from '../data/orientationProgrammes';
import { orienter } from '../engine/orientation';
import { ecrireBilan, lireBilan } from '../state/questionnaireBilan';
import q from './Questionnaire.module.css';
import b from './QuestionnaireBilan.module.css';

export function QuestionnaireBilanScreen({ onRetour }: { onRetour: () => void }) {
  const [etat, setEtat] = useState<EtatBilan>(lireBilan);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [stop, setStop] = useState<Arret | null>(null);

  const secs = sectionsVisibles(etat);
  const step = Math.min(etat.step, secs.length);

  function changer(e: EtatBilan) {
    setEtat(e);
    ecrireBilan(e);
  }
  function aller(s: number) {
    setErreurs([]);
    setStop(null);
    changer({ ...etat, step: s });
    window.scrollTo(0, 0);
  }
  function effacer(message: string) {
    if (!window.confirm(message)) return;
    setErreurs([]);
    setStop(null);
    changer(etatVide());
    window.scrollTo(0, 0);
  }

  if (stop !== null) {
    return (
      <div className={q.ecran}>
        <EcranArret
          arret={stop}
          onModifier={() => aller(step)}
          onEffacer={() => effacer(TEXTES.effacerConfirmation)}
        />
      </div>
    );
  }

  return (
    <div className={q.ecran}>
      {step >= 0 && <Barre step={step} secs={secs} />}
      {step < 0 && (
        <Accueil
          etat={etat}
          onChange={changer}
          onRetour={onRetour}
          onCommencer={() => {
            const s = arret(etat);
            if (s) {
              setStop(s);
              window.scrollTo(0, 0);
            } else aller(0);
          }}
        />
      )}
      {step >= 0 && step < secs.length && (
        <EcranSection
          sec={secs[step]!}
          derniere={step === secs.length - 1}
          etat={etat}
          erreurs={erreurs}
          onChange={changer}
          onRetour={() => aller(step - 1 < 0 ? -1 : step - 1)}
          onSuivant={() => {
            const m = manquantes(secs[step]!, etat.A);
            if (m.length) {
              setErreurs(m);
              setTimeout(() => {
                document
                  .querySelector(`[data-q="${m[0]}"]`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 0);
              return;
            }
            const s = arret(etat);
            if (s) {
              setStop(s);
              window.scrollTo(0, 0);
            } else aller(step + 1);
          }}
        />
      )}
      {step >= secs.length && (
        <Fin
          etat={etat}
          onModifier={() => aller(0)}
          onRecommencer={() => effacer(TEXTES.recommencerConfirmation)}
          onRetour={onRetour}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------- barre --

function Barre({ step, secs }: { step: number; secs: SectionBilan[] }) {
  const total = secs.length;
  const fini = step >= total;
  return (
    <div className={q.barre}>
      <div className={q.barreTexte}>
        <span>{fini ? TEXTES.termine : `Étape ${Math.min(step + 1, total)} sur ${total}`}</span>
        <span>{fini ? '' : TEXTES.modules[secs[step]!.mod]}</span>
      </div>
      <div className={q.jauge}>
        <div className={q.jaugePleine} style={{ width: `${fini ? 100 : (step / total) * 100}%` }} />
      </div>
    </div>
  );
}

// --------------------------------------------------------------- accueil --

function Accueil({
  etat,
  onChange,
  onCommencer,
  onRetour,
}: {
  etat: EtatBilan;
  onChange: (e: EtatBilan) => void;
  onCommencer: () => void;
  onRetour: () => void;
}) {
  const [manque, setManque] = useState<'' | 'prenom' | 'profil' | 'accord'>('');
  return (
    <div>
      <h1 className={q.titre}>{TEXTES.titre}</h1>
      <p className={q.chapeau}>{TEXTES.chapeau}</p>
      <p className={b.avertissement}>{TEXTES.avertissement}</p>
      <div className={q.feuille}>
        <div className={`${q.champ} ${manque === 'prenom' ? q.champErreur : ''}`}>
          <label className={q.libelle} htmlFor="bilan-prenom">
            {TEXTES.prenom}
          </label>
          <input
            id="bilan-prenom"
            className={q.texte}
            type="text"
            autoComplete="given-name"
            value={etat.name}
            onChange={(e) => {
              setManque('');
              onChange({ ...etat, name: e.target.value });
            }}
          />
        </div>
        <div className={`${q.champ} ${manque === 'profil' ? q.champErreur : ''}`}>
          <span className={q.libelle} id="l-profil">
            {TEXTES.profil}
          </span>
          <div className={q.puces} role="radiogroup" aria-labelledby="l-profil">
            {PROFILS.map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={etat.profil === v}
                className={`${q.puce} ${etat.profil === v ? q.puceOn : ''}`}
                onClick={() => {
                  setManque('');
                  onChange({ ...etat, profil: v });
                }}
              >
                {l}
              </button>
            ))}
          </div>
          {manque === 'profil' && (
            <p className={q.erreur} role="alert">
              {TEXTES.profilErreur}
            </p>
          )}
        </div>
        <div className={q.champ}>
          <span className={q.libelle} id="l-situ">
            {TEXTES.situation}
          </span>
          <span className={q.aide}>{TEXTES.situationAide}</span>
          <div className={q.puces} role="group" aria-labelledby="l-situ">
            {SITUATIONS.map((s) => {
              const on = etat.situ.includes(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={on}
                  className={`${q.puce} ${on ? q.puceOn : ''}`}
                  onClick={() =>
                    onChange({
                      ...etat,
                      situ: SITUATIONS.map((x) => x.key).filter((k) =>
                        k === s.key ? !on : etat.situ.includes(k),
                      ),
                    })
                  }
                >
                  {s.l}
                </button>
              );
            })}
          </div>
        </div>
        <div className={`${q.champ} ${manque === 'accord' ? q.champErreur : ''}`} id="bilan-accord">
          <label className={b.accord}>
            <input
              type="checkbox"
              style={{ appearance: 'auto' }}
              checked={etat.consent !== ''}
              onChange={(e) => {
                setManque('');
                onChange({
                  ...etat,
                  consent: e.target.checked ? new Date().toLocaleDateString('fr-FR') : '',
                });
              }}
            />
            <span>{TEXTES.consentement}</span>
          </label>
          {manque === 'accord' && (
            <p className={q.erreur} role="alert">
              {TEXTES.consentementErreur}
            </p>
          )}
        </div>
      </div>
      <div className={q.nav}>
        <button type="button" className={q.fantome} onClick={onRetour}>
          {TEXTES.retour}
        </button>
        <button
          type="button"
          className={q.principal}
          onClick={() => {
            if (!etat.name.trim()) {
              setManque('prenom');
              document.getElementById('bilan-prenom')?.focus();
            } else if (!etat.profil) setManque('profil');
            else if (!etat.consent) {
              setManque('accord');
              document
                .getElementById('bilan-accord')
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else onCommencer();
          }}
        >
          {TEXTES.commencer}
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- arrêt --

function EcranArret({
  arret: a,
  onModifier,
  onEffacer,
}: {
  arret: Arret;
  onModifier: () => void;
  onEffacer: () => void;
}) {
  const rouge = a.type === 'rouge';
  return (
    <div data-arret={a.type}>
      <h1 className={q.titre}>{rouge ? TEXTES.arretRougeTitre : TEXTES.arretHorsTitre}</h1>
      <p className={b.avertissement}>
        {rouge ? TEXTES.arretRouge : `${TEXTES.arretHorsDebut}${a.why}${TEXTES.arretHorsFin}`}
      </p>
      <p className={q.chapeau}>{rouge ? TEXTES.arretRougeSuite : TEXTES.arretHorsSuite}</p>
      <p className={q.aide}>{TEXTES.arretContact}</p>
      <div className={q.actions}>
        <button type="button" className={q.principal} onClick={onModifier}>
          {TEXTES.modifier}
        </button>
        <button type="button" className={q.fantome} onClick={onEffacer}>
          {TEXTES.effacer}
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- section --

function EcranSection({
  sec,
  derniere,
  etat,
  erreurs,
  onChange,
  onRetour,
  onSuivant,
}: {
  sec: SectionBilan;
  derniere: boolean;
  etat: EtatBilan;
  erreurs: string[];
  onChange: (e: EtatBilan) => void;
  onRetour: () => void;
  onSuivant: () => void;
}) {
  const poser = (id: string, v: unknown) => onChange({ ...etat, A: { ...etat.A, [id]: v } });
  return (
    <div>
      <h1 className={q.titre}>{sec.title}</h1>
      {sec.intro && <p className={q.chapeau}>{sec.intro}</p>}
      {sec.qs.some((x) => x.req) && <p className={q.aide}>{TEXTES.obligatoires}</p>}
      <div className={q.feuille} style={{ marginTop: 10 }}>
        {sec.qs
          .filter((x) => estVisible(x, etat.A))
          .map((x) => (
            <Question
              key={x.id}
              question={x}
              etat={etat}
              erreur={erreurs.includes(x.id)}
              poser={poser}
            />
          ))}
      </div>
      <div className={q.nav}>
        <button type="button" className={q.fantome} onClick={onRetour}>
          {TEXTES.retour}
        </button>
        <button type="button" className={q.principal} onClick={onSuivant}>
          {derniere ? TEXTES.voirResume : TEXTES.suivant}
        </button>
      </div>
    </div>
  );
}

function Question({
  question: x,
  etat,
  erreur,
  poser,
}: {
  question: QuestionBilan;
  etat: EtatBilan;
  erreur: boolean;
  poser: (id: string, v: unknown) => void;
}) {
  const A = etat.A;
  const lId = `l-${x.id}`;
  const v = A[x.id];
  const texte = typeof v === 'string' ? v : '';
  const autreOuvert =
    x.other === true && (Array.isArray(v) ? (v as string[]).includes('Autre') : v === 'Autre');

  let controle: React.ReactNode = null;
  if (x.type === 'area') {
    controle = (
      <textarea
        className={b.zone}
        aria-labelledby={lId}
        value={texte}
        onChange={(e) => poser(x.id, e.target.value)}
      />
    );
  } else if (x.type === 'text') {
    controle = (
      <input
        className={q.texte}
        type="text"
        aria-labelledby={lId}
        value={texte}
        onChange={(e) => poser(x.id, e.target.value)}
      />
    );
  } else if (x.type === 'num') {
    controle = (
      <div className={q.ligneNombre}>
        <input
          className={q.nombre}
          type="text"
          inputMode="decimal"
          aria-labelledby={lId}
          value={texte}
          onChange={(e) => poser(x.id, e.target.value)}
        />
        {x.unit && <span className={q.unite}>{x.unit}</span>}
      </div>
    );
  } else if (x.type === 'single' || x.type === 'scale') {
    const opts = x.type === 'scale' ? ECHELLE : (x.opts ?? []);
    controle = (
      <div
        className={`${q.puces} ${x.type === 'scale' ? b.echelle : ''}`}
        role="radiogroup"
        aria-labelledby={lId}
      >
        {opts.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={v === o}
            className={`${q.puce} ${v === o ? q.puceOn : ''}`}
            onClick={() => poser(x.id, o)}
          >
            {o}
          </button>
        ))}
      </div>
    );
  } else if (x.type === 'multi') {
    const cur = Array.isArray(v) ? (v as string[]) : [];
    controle = (
      <div className={q.puces} role="group" aria-labelledby={lId}>
        {(x.opts ?? []).map((o) => {
          const on = cur.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              className={`${q.puce} ${on ? q.puceOn : ''}`}
              onClick={() => poser(x.id, basculerChoix(x, cur, o, !on))}
            >
              {o}
            </button>
          );
        })}
      </div>
    );
  } else if (x.type === 'check') {
    const cur = Array.isArray(v) ? (v as string[]) : [];
    controle = (
      <div role="group" aria-labelledby={lId}>
        {groupesVisibles(x, A).map((g) => (
          <div key={g.l || 'fin'}>
            {g.l && <span className={b.groupe}>{g.l}</span>}
            <div className={q.puces}>
              {g.o.map((o) => {
                const on = cur.includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={on}
                    className={`${q.puce} ${on ? q.puceOn : ''}`}
                    onClick={() => poser(x.id, basculerCoche(x, A, o, !on))}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <input
          className={q.texte}
          style={{ marginTop: 10 }}
          type="text"
          placeholder={TEXTES.autreExercice}
          aria-label={TEXTES.autreExercice}
          value={typeof A[`${x.id}_o`] === 'string' ? (A[`${x.id}_o`] as string) : ''}
          onChange={(e) => poser(`${x.id}_o`, e.target.value)}
        />
      </div>
    );
  } else if (x.type === 'group') {
    const o =
      v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, string>) : {};
    const champ = (k: string, val: string) => poser(x.id, { ...o, [k]: val });
    controle = (
      <div className={b.grille}>
        {(x.fields ?? []).map((f) => {
          const id = `${x.id}_${f.k}`;
          return (
            <div key={f.k} className={f.wide ? b.large : undefined}>
              <label className={b.etiquette} htmlFor={id}>
                {f.l}
              </label>
              {f.type === 'select' ? (
                <select
                  id={id}
                  className={q.texte}
                  value={o[f.k] ?? ''}
                  onChange={(e) => champ(f.k, e.target.value)}
                >
                  <option value="">{TEXTES.choisir}</option>
                  {(f.opts ?? []).map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              ) : f.type === 'text' ? (
                <input
                  id={id}
                  className={q.texte}
                  type="text"
                  placeholder={f.ph ?? ''}
                  value={o[f.k] ?? ''}
                  onChange={(e) => champ(f.k, e.target.value)}
                />
              ) : (
                <div className={q.ligneNombre}>
                  <input
                    id={id}
                    className={q.nombre}
                    type="text"
                    inputMode="decimal"
                    value={o[f.k] ?? ''}
                    onChange={(e) => champ(f.k, e.target.value)}
                  />
                  {f.u && <span className={q.unite}>{f.u}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`${q.champ} ${erreur ? q.champErreur : ''}`} data-q={x.id}>
      <span className={q.libelle} id={lId}>
        {x.t}
        {x.req && <span aria-hidden="true"> *</span>}
      </span>
      {x.hint && <span className={q.aide}>{x.hint}</span>}
      {controle}
      {autreOuvert && (
        <input
          className={q.texte}
          style={{ marginTop: 8 }}
          type="text"
          placeholder={TEXTES.autre}
          aria-label={TEXTES.autre}
          value={typeof A[`${x.id}_o`] === 'string' ? (A[`${x.id}_o`] as string) : ''}
          onChange={(e) => poser(`${x.id}_o`, e.target.value)}
        />
      )}
      {erreur && (
        <p className={q.erreur} role="alert">
          {TEXTES.reponseNecessaire}
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- fin --

function Fin({
  etat,
  onModifier,
  onRecommencer,
  onRetour,
}: {
  etat: EtatBilan;
  onModifier: () => void;
  onRecommencer: () => void;
  onRetour: () => void;
}) {
  const texte = resume(etat);
  const liens = liensEnvoi(etat);
  const [statut, setStatut] = useState('');
  const copier = async (message: string = TEXTES.copie) => {
    try {
      await navigator.clipboard.writeText(texte);
      setStatut(message);
    } catch {
      setStatut(TEXTES.copieManuelle);
    }
  };
  return (
    <div>
      <h1 className={q.titre}>{`${TEXTES.finDebut}${etat.name.trim()}${TEXTES.finFin}`}</h1>
      <Orientation etat={etat} />
      <p className={q.chapeau}>{liens.complet ? TEXTES.finComplet : TEXTES.finCourt}</p>
      <textarea className={q.resume} readOnly aria-label="Résumé de tes réponses" value={texte} />
      <div className={q.actions}>
        <a
          className={q.principal}
          href={liens.email}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void copier(liens.complet ? TEXTES.copieAussi : TEXTES.copie)}
        >
          {TEXTES.envoyerEmail}
        </a>
        <a
          className={q.secondaire}
          href={liens.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void copier()}
        >
          {TEXTES.envoyerWhatsapp}
        </a>
        <button type="button" className={q.secondaire} onClick={() => void copier()}>
          {TEXTES.copierSeulement}
        </button>
        <p className={q.statut} role="status" aria-live="polite">
          {statut}
        </p>
      </div>
      <div className={q.nav}>
        <button type="button" className={q.fantome} onClick={onModifier}>
          {TEXTES.modifier}
        </button>
        <button type="button" className={q.fantome} onClick={onRecommencer}>
          {TEXTES.recommencer}
        </button>
      </div>
      <div className={q.nav}>
        <button type="button" className={q.fantome} onClick={onRetour}>
          Retour aux programmes
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------- orientation --

/**
 * « Les programmes qui te correspondent » (`regles-orientation-programmes.md`).
 * Une indication : le bouton ouvre la fiche au catalogue, il ne démarre rien.
 * Propre à l'appli : le résumé envoyé, lui, reste celui du site.
 */
function Orientation({ etat }: { etat: EtatBilan }) {
  const o = orienter(etat);
  if (o.type === 'arret') return null;
  return (
    <section
      className={b.orientation}
      aria-label={TEXTES_ORIENTATION.titre}
      data-orientation={o.type}
    >
      <h2 className={b.orientationTitre}>{TEXTES_ORIENTATION.titre}</h2>
      {o.type === 'orange' ? (
        <p className={q.chapeau}>{TEXTES_ORIENTATION.orange}</p>
      ) : (
        <>
          {o.suggestions.length === 0 && !o.bientot && (
            <p className={q.chapeau}>{TEXTES_ORIENTATION.aucune}</p>
          )}
          {o.bientot && <p className={b.bientot}>{TEXTES_ORIENTATION.bientot}</p>}
          {o.suggestions.map((s) => (
            <div key={s.programme} className={b.suggestion}>
              <p className={b.suggestionNom}>{s.nom}</p>
              <p className={q.aide}>{s.raisons.join(' · ')}</p>
              <a className={q.secondaire} href={`#/catalogue/${s.famille}`}>
                {TEXTES_ORIENTATION.voir}
              </a>
            </div>
          ))}
          {(o.suggestions.length > 0 || o.bientot) && (
            <p className={q.aide}>{TEXTES_ORIENTATION.phrase}</p>
          )}
        </>
      )}
    </section>
  );
}
