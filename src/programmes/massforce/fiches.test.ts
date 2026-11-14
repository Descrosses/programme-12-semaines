/**
 * Les fiches de MASS FORCE (lot F1) et le fond du bloc fiche (lot F3).
 *
 * Ce qu'ils empêchent :
 * - une fiche qui pointe un fichier absent (image vide en salle) ;
 * - une planche de POWER dans MASS (chaque famille garde son avatar) ;
 * - un rattachement à un mouvement voisin mais différent — les trois pièges
 *   relevés à l'audit et les quatre planches partielles restent SANS fiche ;
 * - un changement de fond pour POWER ou MASS CONGESTION.
 */
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ambianceFicheDe } from '../../data/famillesVisuel';
import { FICHES_MASS4 } from '../mass4/fiches';
import { FICHES_FORCE, fichePourForce } from './fiches';
import { SEANCES_FORCE } from './seances';

const fichier = (nom: string) => new URL(`../../../public/fiches/${nom}`, import.meta.url);
/* Planches MASS générées par Guillaume pour MASS FORCE, au gabarit et à l'avatar MASS. */
const PLANCHES_FOURNIES = ['ez-skull-crusher.webp', 'db-alternating-curl.webp'];
const idsForce = SEANCES_FORCE.flatMap((s) => s.lignes.flatMap((l) => l.options.map((o) => o.id)));

describe('les fiches de MASS FORCE', () => {
  it('quatorze mouvements, chacun un vrai exercice de MASS FORCE', () => {
    expect(Object.keys(FICHES_FORCE)).toHaveLength(14);
    for (const id of Object.keys(FICHES_FORCE)) expect(idsForce, id).toContain(id);
  });

  it('chaque fichier existe, et aucun ne vient de POWER', () => {
    for (const f of Object.values(FICHES_FORCE)) {
      expect(existsSync(fichier(f)), f).toBe(true);
      expect(f.startsWith('power12-'), f).toBe(false);
    }
  });

  it('chaque planche est une planche MASS : celle de MASS CONGESTION, ou une planche MASS fournie par Guillaume', () => {
    const planchesMass = new Set([...Object.values(FICHES_MASS4), ...PLANCHES_FOURNIES]);
    for (const f of Object.values(FICHES_FORCE)) expect(planchesMass.has(f), f).toBe(true);
  });

  it('le curl haltères a sa planche MASS, et non celle du curl alterné de MASS CONGESTION', () => {
    expect(fichePourForce('mf-curl-halteres')).toBe('fiches/db-alternating-curl.webp');
  });

  it('la barre au front montre la barre W (planche fournie par Guillaume)', () => {
    expect(fichePourForce('mf-barre-au-front')).toBe('fiches/ez-skull-crusher.webp');
  });

  it('les pièges et les planches partielles restent sans fiche', () => {
    for (const id of [
      'mf-tirage-horizontal-large', // planche en prise serrée neutre
      'mf-push-press-smith', // la planche Smith est un développé strict
      'mf-push-press-barre',
      'mf-developpe-incline-halteres', // planches : incliné Smith ou couché plat
    ]) {
      expect(fichePourForce(id), id).toBeUndefined();
    }
  });

  it('le chemin servi est celui des autres fiches', () => {
    expect(fichePourForce('mf-ecarte-couche')).toBe('fiches/db-fly.webp');
  });

  it('le leg curl prend la planche du leg curl allongé (décision de Guillaume)', () => {
    expect(fichePourForce('mf-leg-curl')).toBe('fiches/leg-curl.webp');
  });

  it('les élévations frontales prennent la planche alternée (décision de Guillaume)', () => {
    expect(fichePourForce('mf-elevations-frontales')).toBe('fiches/front-raise.webp');
  });
});

describe('le fond du bloc fiche (exercice sans fiche)', () => {
  it('MASS FORCE prend la photo MASS de la salle, plus celle du pack POWER', () => {
    expect(ambianceFicheDe('mass-force')).toBe('massSalle');
  });

  it('POWER et MASS CONGESTION gardent exactement leur fond', () => {
    expect(ambianceFicheDe('power12')).toBe('sprint');
    expect(ambianceFicheDe('mass4')).toBe('force');
  });
});
