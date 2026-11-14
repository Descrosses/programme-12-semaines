/**
 * MASS FORCE — la porte des séances.
 *
 * Tant que le départ n'est pas complet, Aujourd'hui, Semaine et les séances
 * affichent cet écran à la place (décisions de Guillaume) :
 * 1. choisir le matériel et les variantes, une fois pour le cycle ;
 * 2. passer par le combiné : une référence pour CHAQUE mouvement évalué, avec
 *    le matériel choisi. Rien n'est transposé d'un matériel à l'autre.
 *
 * La règle elle-même est pure (`programmes/massforce/depart.ts`) ; cet écran
 * ne fait que l'afficher.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ScreenHeader } from '../../components/ScreenHeader';
import { VARIANTES, estVariante } from '../../data/combineMass';
import type { CycleRow, ReferenceForceRow } from '../../db/db';
import { enregistrerChoixForce } from '../../db/massForceRepo';
import { toutesLesReferences } from '../../db/references';
import { cycleActif } from '../../db/repo';
import {
  choixParDefaut,
  etatDepart,
  lignesAChoix,
  testsRequis,
} from '../../programmes/massforce/depart';
import screens from '../Screens.module.css';
import session from '../Session.module.css';
import local from '../Evaluation.module.css';
import porte from './Porte.module.css';

const nomVariante = (v: string) => (estVariante(v) ? VARIANTES[v] : v);

export function PorteMassForce({
  children,
  onCombine,
  onChanged,
}: {
  children: ReactNode;
  onCombine: () => void;
  onChanged: () => void;
}) {
  const [cycle, setCycle] = useState<CycleRow | null | undefined>(undefined);
  const [refs, setRefs] = useState<ReferenceForceRow[]>([]);
  const [brouillon, setBrouillon] = useState<Record<string, string>>(choixParDefaut());
  const [modifier, setModifier] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const relire = async () => {
    const [c, r] = await Promise.all([cycleActif(), toutesLesReferences()]);
    setCycle(c ?? null);
    setRefs(r);
    if (c?.massForce !== undefined) setBrouillon({ ...c.massForce.choix });
  };

  useEffect(() => {
    void relire();
  }, []);

  if (cycle === undefined) return null;
  const choix = cycle?.massForce?.choix;
  const etat = etatDepart(choix, refs);
  if (etat.pret) return <>{children}</>;

  const editionChoix = !etat.choixFaits || modifier;
  const requis = testsRequis(editionChoix ? brouillon : choix);
  const manquants = new Set(etat.manquants.map((t) => `${t.exercice}|${t.variante}`));

  async function confirmer() {
    if (cycle?.id === undefined) return;
    setErreur(null);
    try {
      await enregistrerChoixForce(cycle.id, brouillon);
      setModifier(false);
      await relire();
      onChanged();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Enregistrement impossible.');
    }
  }

  return (
    <div className={screens.screen}>
      <ScreenHeader eyebrow="MASS FORCE" title="Avant de commencer" subtitle="Deux étapes" />

      <section className={screens.card} aria-label="Étape 1 : matériel et variantes">
        <h2 className={screens.cardTitle}>1. Matériel et variantes</h2>
        <p className={screens.cardSub}>
          Choisis une fois pour tout le cycle. Chaque possibilité garde son propre historique.
        </p>
        {editionChoix ? (
          <>
            {lignesAChoix().map((l) => (
              <div key={l.cle}>
                <p className={porte.legende}>{l.libelle}</p>
                <div className={session.tiroirs} role="group" aria-label={l.libelle}>
                  {l.options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className={`${session.tiroir} ${brouillon[l.cle] === o.id ? local.choisi : ''}`}
                      aria-pressed={brouillon[l.cle] === o.id}
                      onClick={() => setBrouillon((b) => ({ ...b, [l.cle]: o.id }))}
                    >
                      {o.nom}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" className={screens.primary} onClick={() => void confirmer()}>
              Confirmer mes choix
            </button>
            {erreur !== null && <p className={local.erreur}>{erreur}</p>}
          </>
        ) : (
          <>
            <p className={screens.cardSub}>Choix confirmés.</p>
            <button type="button" className={screens.secondary} onClick={() => setModifier(true)}>
              Modifier mes choix
            </button>
          </>
        )}
      </section>

      <section className={screens.card} aria-label="Étape 2 : le combiné">
        <h2 className={screens.cardTitle}>2. Le combiné</h2>
        <p className={screens.cardSub}>
          Une référence pour chaque mouvement évalué, avec le matériel choisi. Une référence prise
          avec un autre matériel ne compte pas : aucune charge n’est transposée.
        </p>
        <ul className={porte.etats}>
          {requis.map((t) => {
            const manque = editionChoix || manquants.has(`${t.exercice}|${t.variante}`);
            return (
              <li key={`${t.exercice}|${t.variante}`}>
                <span>
                  {t.nom} · {nomVariante(t.variante)}
                </span>
                <span className={`${porte.statut} ${!manque ? porte.fait : ''}`}>
                  {editionChoix ? '—' : manque ? 'À faire' : 'Fait ✓'}
                </span>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className={screens.primary}
          onClick={onCombine}
          disabled={editionChoix}
        >
          Ouvrir le combiné
        </button>
        {editionChoix && <p className={screens.hint}>Confirme d’abord tes choix.</p>}
      </section>
    </div>
  );
}
