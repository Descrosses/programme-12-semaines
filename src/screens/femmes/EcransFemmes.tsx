/**
 * Le point d'entrée des écrans FEMMES, et leur état.
 *
 * ── Pourquoi un état local, et pas la base ────────────────────────────────
 *
 * Semaine, jour, version et niveau vivent ici, en mémoire. FEMMES 8 est
 * `a-venir` : il n'a pas de cycle en base, et lui en fabriquer un reviendrait
 * à figer un schéma de persistance que personne n'a validé — puis à le
 * migrer. Ces écrans montrent donc de VRAIES données du programme, sans rien
 * écrire. C'est dit à l'écran plutôt que caché.
 */

import { useState } from 'react';
import { applique } from './etat';
import {
  ETAT_INITIAL,
  FemmesAujourdhui,
  FemmesExercice,
  FemmesSeance,
  FemmesSecurite,
  FemmesSemaine,
  type EtatFemmes,
} from './FemmesScreens';
import type { OngletFemmes } from './Pieces';

export type VueFemmes = 'aujourdhui' | 'semaine' | 'seance' | 'exercice' | 'securite';

export function EcransFemmes({
  vue,
  onNaviguer,
  onSortir,
}: {
  vue: VueFemmes;
  onNaviguer: (v: VueFemmes) => void;
  /*
   * La sortie du programme, vers l'accueil MAJK.
   *
   * Elle manquait. L'ancien bouton « MAJK » de la barre du bas appelait
   * `onAller('aujourdhui')` : il revenait à l'écran Aujourd'hui de FEMMES,
   * pas à MAJK. Une fois entrée dans le programme, on n'en sortait que par
   * le bouton Retour du téléphone.
   */
  onSortir: () => void;
}) {
  const [etat, setEtat] = useState<EtatFemmes>(ETAT_INITIAL);
  /* Quel exercice du circuit est ouvert en plein écran. */
  const [index, setIndex] = useState(0);

  /* Les onglets du bas ne mènent qu'aux écrans qui existent ; les autres
     ramènent à Aujourd'hui plutôt que d'ouvrir une page vide. */
  const aller = (o: OngletFemmes) => {
    if (o === 'semaine') onNaviguer('semaine');
    else if (o === 'reglages') onNaviguer('securite');
    else onNaviguer('aujourdhui');
  };

  if (vue === 'semaine') {
    return (
      <FemmesSemaine
        etat={etat}
        onSemaine={(w) => setEtat(applique(etat, { semaine: w }))}
        onJour={(d) => {
          setEtat(applique(etat, { jour: d }));
          onNaviguer('seance');
        }}
        onAller={aller}
      />
    );
  }
  if (vue === 'seance') {
    return (
      <FemmesSeance
        etat={etat}
        onVersion={(v) => setEtat(applique(etat, { version: v }))}
        onAller={aller}
        onExercice={(i) => {
          setIndex(i);
          onNaviguer('exercice');
        }}
      />
    );
  }
  if (vue === 'exercice') {
    return (
      <FemmesExercice
        etat={etat}
        index={index}
        onRetour={() => onNaviguer('seance')}
        onIndex={setIndex}
        onAller={aller}
      />
    );
  }
  if (vue === 'securite') return <FemmesSecurite onAller={aller} />;

  return (
    <FemmesAujourdhui
      etat={etat}
      onAller={aller}
      onCommencer={() => onNaviguer('seance')}
      onSortir={onSortir}
    />
  );
}
