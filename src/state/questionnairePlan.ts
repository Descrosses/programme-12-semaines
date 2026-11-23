/**
 * Les réponses au questionnaire « Votre plan alimentaire », sur CE téléphone.
 *
 * En `localStorage`, comme sur le site d'origine, et jamais en base : ce
 * sont des réponses en cours, faites pour être ENVOYÉES au coach. Elles
 * n'entrent ni dans l'export ni dans la sauvegarde en ligne — seule la liste
 * d'aliments, une fois reprise dans « Mon plan », devient une donnée de
 * l'appli.
 *
 * La relecture filtre ce qu'elle ne reconnaît pas, comme le site.
 */

import { CATEGORIES, CLES_PROFIL, ETAPES_PROFIL } from '../data/questionnairePlanAlimentaire';
import { ALIMENTS } from '../data/questionnairePlanAlimentaire';
import {
  etatVide,
  type AlimentAjoute,
  type EtatQuestionnaire,
} from '../engine/questionnairePlanAlimentaire';

const CLE = 'p12s:questionnaire-plan-alimentaire';

export function lireQuestionnaire(): EtatQuestionnaire {
  const etat = etatVide();
  try {
    const s = JSON.parse(localStorage.getItem(CLE) ?? 'null') as Partial<EtatQuestionnaire> | null;
    if (!s) return etat;
    const cats = CATEGORIES.map((c) => c.id) as string[];
    etat.customFoods = (Array.isArray(s.customFoods) ? s.customFoods : [])
      .filter((f): f is AlimentAjoute => !!f && !!f.id && !!f.name && cats.includes(f.category))
      .map((f) => ({ id: f.id, name: f.name, category: f.category, custom: true }));
    const connus = new Set([...ALIMENTS.map((f) => f.id), ...etat.customFoods.map((f) => f.id)]);
    etat.selected = [...new Set(Array.isArray(s.selected) ? s.selected : [])].filter((id) =>
      connus.has(id),
    );
    if (s.profile && typeof s.profile === 'object') {
      for (const k of CLES_PROFIL) {
        const v = (s.profile as Record<string, unknown>)[k];
        if (k === 'sportType') {
          if (Array.isArray(v))
            etat.profile.sportType = v.filter((x): x is string => typeof x === 'string');
        } else if (typeof v === 'string') etat.profile[k] = v;
      }
    }
    const st = s.step;
    if (
      st === 'intro' ||
      st === 'recap' ||
      st === 'done' ||
      (typeof st === 'string' && (ETAPES_PROFIL as readonly string[]).includes(st)) ||
      (typeof st === 'number' && Number.isInteger(st) && st >= 0 && st < CATEGORIES.length)
    ) {
      etat.step = st;
    }
  } catch {
    // Illisible : on repart d'un questionnaire vierge.
  }
  return etat;
}

export function ecrireQuestionnaire(etat: EtatQuestionnaire): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch {
    // Stockage refusé (navigation privée) : les réponses vivent le temps de l'écran.
  }
}
