/**
 * Les muscles et erreurs des planches POWER 12 (lot 6 de la DA MAJK).
 *
 * Le texte vient du tableau « MAJK — Fiches techniques POWER 12 », validé
 * ligne par ligne par Guillaume. Ce test fige trois choses :
 * - chaque planche a son texte, et aucun texte ne vise un mouvement sans
 *   planche ;
 * - la forme : au moins un muscle principal, une à trois erreurs, rien de
 *   vide ;
 * - le rattachement : un test du combiné emprunte le texte du mouvement dont
 *   il prend la planche, et MASS n'en reçoit aucun.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InfosDeLaFiche } from '../components/FicheTechnique';
import { EXERCISES, exercise } from './exercises';
import { FICHES_POWER12 } from './fichesPower12';
import { MUSCLES_ERREURS_POWER12, infosFichePower12 } from './musclesErreursPower12';
import { EXERCICES_MASS4 } from '../programmes/mass4/exercices';

describe('une entrée par planche, et rien de plus', () => {
  /*
   * Planches arrivées APRÈS le tableau MAJK (révision 5) : leur texte n'existe
   * pas encore et ne s'invente pas. La section reste absente sous la planche
   * jusqu'à ce que Guillaume valide une ligne.
   */
  const EN_ATTENTE_DE_TEXTE = ['barbell-offset-hold'];

  it('les 38 planches du tableau ont leur texte, les autres attendent le leur', () => {
    const avecTexte = Object.keys(FICHES_POWER12).filter((id) => !EN_ATTENTE_DE_TEXTE.includes(id));
    expect(Object.keys(MUSCLES_ERREURS_POWER12).sort()).toEqual(avecTexte.sort());
    expect(Object.keys(MUSCLES_ERREURS_POWER12)).toHaveLength(38);
    for (const id of EN_ATTENTE_DE_TEXTE) expect(exercise(id).infosFiche, id).toBeUndefined();
  });

  it('au moins un muscle principal, une à trois erreurs, aucun texte vide', () => {
    for (const [id, infos] of Object.entries(MUSCLES_ERREURS_POWER12)) {
      expect(infos.principaux.length, id).toBeGreaterThan(0);
      expect(infos.erreurs.length, id).toBeGreaterThan(0);
      expect(infos.erreurs.length, id).toBeLessThanOrEqual(3);
      for (const t of [...infos.principaux, ...infos.secondaires, ...infos.erreurs]) {
        expect(t.trim(), id).not.toBe('');
      }
    }
  });
});

describe('le texte est celui du tableau validé', () => {
  it('Back Squat, mot pour mot', () => {
    expect(MUSCLES_ERREURS_POWER12['back-squat']).toEqual({
      principaux: ['Quadriceps', 'Grands fessiers'],
      secondaires: ['Adducteurs', 'Ischio-jambiers', 'Érecteurs du rachis', 'Sangle abdominale'],
      erreurs: [
        'Genoux qui rentrent à la remontée',
        'Talons qui décollent ou poids qui part sur l’avant du pied',
        'Dos qui s’arrondit en bas (bascule du bassin)',
      ],
    });
  });

  it('une virgule entre parenthèses ne coupe pas un muscle en deux', () => {
    expect(MUSCLES_ERREURS_POWER12['face-pull']!.principaux).toEqual([
      'Deltoïdes postérieurs',
      'Rotateurs externes (infra-épineux, petit rond)',
    ]);
  });
});

describe('le rattachement aux exercices', () => {
  it('une planche POWER porte son texte', () => {
    expect(exercise('deadlift').infosFiche).toBe(MUSCLES_ERREURS_POWER12['deadlift']);
  });

  it('un test du combiné emprunte le texte de son mouvement', () => {
    expect(infosFichePower12('test-squat-1rm')).toBe(MUSCLES_ERREURS_POWER12['back-squat']);
    expect(exercise('test-squat-1rm').infosFiche).toBe(MUSCLES_ERREURS_POWER12['back-squat']);
    expect(exercise('test-vertical-jump').infosFiche).toBe(
      MUSCLES_ERREURS_POWER12['test-vertical-jump'],
    );
  });

  it('jamais de texte sans planche', () => {
    for (const def of Object.values(EXERCISES)) {
      if (def.infosFiche !== undefined) expect(def.fiche, def.id).toBeDefined();
    }
  });

  it('MASS n’en reçoit aucun', () => {
    for (const ex of Object.values(EXERCICES_MASS4)) {
      expect((ex as { infosFiche?: unknown }).infosFiche, ex.id).toBeUndefined();
    }
  });
});

describe('l’affichage sous la planche', () => {
  const rien = () => {};

  it('muscles principaux, secondaires, erreurs, et le retour aux séries', () => {
    const html = renderToStaticMarkup(
      <InfosDeLaFiche infos={MUSCLES_ERREURS_POWER12['back-squat']!} onCompris={rien} />,
    );
    expect(html).toContain('Muscles sollicités');
    expect(html).toContain('Principaux');
    expect(html).toContain('Secondaires');
    expect(html).toContain('Érecteurs du rachis');
    expect(html).toContain('Erreurs à éviter');
    expect(html).toContain('Genoux qui rentrent à la remontée');
    expect(html).toContain('C’est compris — aux séries');
  });

  it('une section vide ne s’affiche pas', () => {
    const html = renderToStaticMarkup(
      <InfosDeLaFiche
        infos={{ principaux: ['Adducteurs'], secondaires: [], erreurs: [] }}
        onCompris={rien}
      />,
    );
    expect(html).not.toContain('Secondaires');
    expect(html).not.toContain('Erreurs à éviter');
  });
});
