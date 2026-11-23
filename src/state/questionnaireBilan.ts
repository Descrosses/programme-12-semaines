/**
 * Les réponses au « Bilan sportif et nutrition », sur CE téléphone.
 *
 * En `localStorage`, comme sur le site d'origine, et jamais en base : ce
 * sont des réponses faites pour être ENVOYÉES au coach. Elles n'entrent ni
 * dans l'export ni dans la sauvegarde en ligne. La relecture ne garde que
 * ce qu'elle reconnaît.
 */

import { SITUATIONS } from '../data/questionnaireBilanSportif';
import { etatVide, type EtatBilan } from '../engine/questionnaireBilanSportif';

const CLE = 'p12s:questionnaire-bilan-sportif';

export function lireBilan(): EtatBilan {
  const etat = etatVide();
  try {
    const s = JSON.parse(localStorage.getItem(CLE) ?? 'null') as Partial<EtatBilan> | null;
    if (!s || typeof s !== 'object') return etat;
    if (typeof s.name === 'string') etat.name = s.name;
    if (s.profil === 'debutant' || s.profil === 'sportif') etat.profil = s.profil;
    const cles = SITUATIONS.map((x) => x.key);
    if (Array.isArray(s.situ)) etat.situ = cles.filter((k) => s.situ!.includes(k));
    if (s.A && typeof s.A === 'object' && !Array.isArray(s.A)) etat.A = s.A;
    if (typeof s.step === 'number' && Number.isInteger(s.step) && s.step >= -1) etat.step = s.step;
    if (typeof s.consent === 'string') etat.consent = s.consent;
  } catch {
    // Illisible : on repart d'un bilan vierge.
  }
  return etat;
}

export function ecrireBilan(etat: EtatBilan): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch {
    // Stockage refusé (navigation privée) : les réponses vivent le temps de l'écran.
  }
}
