/**
 * La Nutrition de FEMMES (Guillaume, 23 novembre : « crée le menu
 * nutrition »).
 *
 * Ce n'est pas un nouvel outil : c'est l'écran Nutrition de l'appli, celui
 * de « Mon plan » (cible du jour, repas composés, journal, pesée), sous le
 * bandeau et le menu du bas de FEMMES. Ce qui change, et pourquoi :
 *
 * - JAMAIS le plan historique : c'est celui de Guillaume
 *   (`sansPlanHistorique`) ;
 * - le palier du jour : FEMMES n'a pas de calendrier (la séance du jour est la
 *   première non faite). Le programme dit « entraînement » si une séance
 *   FEMMES a été TERMINÉE aujourd'hui, « repos » sinon ; un choix fait à
 *   l'écran l'emporte, comme partout.
 *
 * Les cibles et la fiche se règlent dans les Réglages FEMMES (Profil).
 */
import { useEffect, useState } from 'react';
import type { DayKind } from '../../data/types';
import type { FemmesSeanceRow } from '../../db/db';
import { dayKindOverride } from '../../db/repo';
import { NutritionScreen } from '../NutritionScreen';
import { Bandeau, NavFemmes, type OngletFemmes } from './Pieces';
import s from './Femmes.module.css';

/** « Entraînement » si une séance FEMMES a été terminée ce jour-là. */
export function paliersFemmes(seances: readonly FemmesSeanceRow[], jour: string): DayKind {
  return seances.some((r) => r.terminee && r.date === jour) ? 'train' : 'rest';
}

export function FemmesNutrition({
  seances,
  onAller,
}: {
  seances: readonly FemmesSeanceRow[];
  onAller: (o: OngletFemmes) => void;
}) {
  const [paliers, setPaliers] = useState<{ retenu: DayKind; programme: DayKind } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vivant = true;
    // La même clé de jour que le reste de l'appli (App, NutritionScreen).
    const jour = new Date().toISOString().slice(0, 10);
    const programme = paliersFemmes(seances, jour);
    void dayKindOverride(jour).then((choix) => {
      if (vivant) setPaliers({ retenu: choix ?? programme, programme });
    });
    return () => {
      vivant = false;
    };
  }, [seances, version]);

  if (paliers === null) return <div className={s.page} />;
  return (
    <div className={s.pageNutrition}>
      <NutritionScreen
        key={`${version}-${paliers.retenu}`}
        todayKind={paliers.retenu}
        kindProgramme={paliers.programme}
        todayDay={null}
        todayWeek={null}
        onDayKindChange={() => setVersion((v) => v + 1)}
        sansPlanHistorique
        entete={
          <Bandeau
            photo="femmesNutrition"
            titre="Nutrition"
            taille="xl"
            sousTitre="Mon suivi nutritionnel"
          />
        }
      />
      <NavFemmes actif="nutrition" onAller={onAller} />
    </div>
  );
}
