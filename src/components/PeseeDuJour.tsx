/**
 * La pesée du jour, en tête de l'écran Semaine.
 *
 * ── Pourquoi ici ───────────────────────────────────────────────────────────
 *
 * La saisie vivait tout en bas de l'onglet Nutrition : ouvrir l'onglet,
 * faire défiler quatre cartes, puis régler le poids. Pour un geste qu'on
 * fait au réveil, tous les jours, c'était trois étapes de trop — et une
 * pesée qu'on remet à plus tard est une pesée perdue.
 *
 * Elle est donc posée sur le premier écran du programme. C'est la MÊME
 * donnée, pas une copie : même table `measurements`, même `saveMeasurement`.
 * Ce qui est saisi ici apparaît dans Nutrition, dans la moyenne 7 jours et
 * dans les courbes, sans rien synchroniser.
 *
 * ── Ce qu'elle ne fait pas ─────────────────────────────────────────────────
 *
 * Aucun commentaire sur le chiffre. L'interprétation (tendance, écart à la
 * cible) reste dans Nutrition, où elle s'appuie sur sept jours et non sur
 * une pesée isolée, qui bouge de 1 à 2 kg selon l'hydratation.
 */

import { useEffect, useState } from 'react';
import { allMeasurements, getMeasurement, saveMeasurement } from '../db/repo';
import { fr } from '../engine/format';
import { Stepper, stepValue } from './Stepper';
import local from './PeseeDuJour.module.css';

const MIN_KG = 40;
const MAX_KG = 160;

export function PeseeDuJour() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [poids, setPoids] = useState<number | null>(null);
  const [charge, setCharge] = useState(false);
  /*
   * La dernière pesée connue, pour donner un point de départ aux boutons.
   *
   * Sans elle, le premier « + » d'une journée vide partait du plancher du
   * champ et ENREGISTRAIT 40,1 kg : une fausse pesée, écrite d'un seul
   * appui, qui tirait ensuite la moyenne 7 jours vers le bas. Les boutons
   * repartent donc de la veille, à 100 g près — c'est presque toujours à
   * deux ou trois appuis du chiffre du matin.
   */
  const [derniere, setDerniere] = useState<number | null>(null);

  useEffect(() => {
    let vivant = true;
    void Promise.all([getMeasurement(todayIso), allMeasurements()]).then(([m, toutes]) => {
      if (!vivant) return;
      setPoids(m?.weightKg ?? null);
      const precedentes = toutes.filter((r) => r.date < todayIso && r.weightKg != null);
      setDerniere(precedentes.at(-1)?.weightKg ?? null);
      setCharge(true);
    });
    return () => {
      vivant = false;
    };
  }, [todayIso]);

  async function enregistrer(valeur: number | null) {
    setPoids(valeur);
    await saveMeasurement(todayIso, { weightKg: valeur });
  }

  // Rien tant que la base n'a pas répondu : afficher « — » une fraction de
  // seconde avant le vrai chiffre ferait croire que la pesée a disparu.
  if (!charge) return null;

  return (
    <section className={local.carte} aria-label="Pesée du jour">
      <div className={local.tete}>
        <h2 className={local.titre}>Pesée du jour</h2>
        <span className={local.etat}>
          {poids !== null
            ? `${fr(poids)} kg enregistrés`
            : derniere !== null
              ? `Dernière : ${fr(derniere)} kg`
              : 'Touche le chiffre pour saisir'}
        </span>
      </div>
      <Stepper
        label="Poids ce matin"
        value={poids}
        step={0.1}
        min={MIN_KG}
        max={MAX_KG}
        unit="kg"
        tone="accent"
        onStep={(d) => {
          // Journée vide : le premier appui POSE la dernière pesée connue,
          // sans la décaler. Sans aucune pesée passée, on ne devine rien —
          // il faut taper le chiffre.
          if (poids === null) {
            if (derniere !== null) void enregistrer(derniere);
            return;
          }
          void enregistrer(stepValue(poids, d, MIN_KG, MAX_KG));
        }}
        onCommit={(v) => void enregistrer(v)}
      />
    </section>
  );
}
