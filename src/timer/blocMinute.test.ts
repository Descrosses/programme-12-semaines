/*
 * Ce que ces tests tiennent : un bloc minuté se recalcule depuis sa fin, et
 * NON depuis un décompte gardé en mémoire. C'est la seule propriété qui
 * compte — elle est ce qui fait survivre le compte à rebours à l'écran
 * éteint, au passage en arrière-plan et au rechargement de la page.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  arreterBloc,
  blocFini,
  cleBloc,
  demarrerBloc,
  depassementSec,
  lireBloc,
  lireBlocs,
  minutesSecondes,
  ratioBloc,
  restantSec,
} from './blocMinute';

const T0 = new Date('2026-11-07T10:00:00Z').getTime();

/* Pas de navigateur sous vitest : un `localStorage` de poche, remis à neuf
 * avant chaque test — même procédé que `restTimer.test.ts`. */
beforeEach(() => {
  const stock = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => stock.get(k) ?? null,
    setItem: (k: string, v: string) => void stock.set(k, v),
    removeItem: (k: string) => void stock.delete(k),
    clear: () => stock.clear(),
  });
});

describe('clé d’un bloc', () => {
  it('distingue le même circuit sur deux jours différents', () => {
    expect(cleBloc(1, 0, 'circuit-1')).not.toBe(cleBloc(1, 2, 'circuit-1'));
    expect(cleBloc(1, 0, 'circuit-1')).toBe('1-0-circuit-1');
  });
});

describe('démarrage et décompte', () => {
  it('enregistre une fin, pas une durée qui s’épuise toute seule', () => {
    const bloc = demarrerBloc('c1', 10, T0);
    expect(bloc.finAt).toBe(T0 + 600_000);
    expect(bloc.totalSec).toBe(600);
  });

  it('le temps restant se recalcule à l’instant où on le lit', () => {
    const bloc = demarrerBloc('c1', 10, T0);
    expect(restantSec(bloc, T0)).toBe(600);
    expect(restantSec(bloc, T0 + 60_000)).toBe(540);
    // Le cas qui compte : l'écran s'est éteint neuf minutes.
    expect(restantSec(bloc, T0 + 540_000)).toBe(60);
  });

  it('ne descend jamais sous zéro, et compte le dépassement à part', () => {
    const bloc = demarrerBloc('c1', 10, T0);
    expect(restantSec(bloc, T0 + 660_000)).toBe(0);
    expect(depassementSec(bloc, T0 + 660_000)).toBe(60);
    expect(depassementSec(bloc, T0 + 300_000)).toBe(0);
    expect(blocFini(bloc, T0 + 300_000)).toBe(false);
    expect(blocFini(bloc, T0 + 600_000)).toBe(true);
  });

  it('la part écoulée va de 0 à 1 et s’y arrête', () => {
    const bloc = demarrerBloc('c1', 10, T0);
    expect(ratioBloc(bloc, T0)).toBe(0);
    expect(ratioBloc(bloc, T0 + 300_000)).toBeCloseTo(0.5, 2);
    expect(ratioBloc(bloc, T0 + 900_000)).toBe(1);
  });
});

describe('plusieurs blocs à la fois', () => {
  it('démarrer un circuit n’arrête pas l’autre', () => {
    demarrerBloc('c1', 10, T0);
    demarrerBloc('c2', 10, T0 + 5_000);
    expect(lireBloc('c1', T0)).not.toBeNull();
    expect(lireBloc('c2', T0)).not.toBeNull();
  });

  it('arrêter un bloc ne retire que celui-là', () => {
    demarrerBloc('c1', 10, T0);
    demarrerBloc('c2', 10, T0);
    arreterBloc('c1', T0);
    expect(lireBloc('c1', T0)).toBeNull();
    expect(lireBloc('c2', T0)).not.toBeNull();
  });

  it('oublie un bloc vieux de plus de douze heures', () => {
    demarrerBloc('c1', 10, T0);
    expect(lireBloc('c1', T0 + 11 * 3_600_000)).not.toBeNull();
    expect(lireBloc('c1', T0 + 13 * 3_600_000)).toBeNull();
  });
});

describe('robustesse du stockage', () => {
  it('un contenu abîmé ne fait pas tomber l’écran', () => {
    localStorage.setItem('majk:blocs-minutes', '{ ceci n’est pas du JSON');
    expect(lireBlocs(T0)).toEqual({});
  });

  it('écarte une entrée incomplète au lieu de la croire', () => {
    localStorage.setItem('majk:blocs-minutes', JSON.stringify({ c1: { finAt: 'bientôt' } }));
    expect(lireBlocs(T0)).toEqual({});
  });
});

describe('format du compte à rebours', () => {
  it('écrit des minutes et des secondes, pas une durée littéraire', () => {
    expect(minutesSecondes(600)).toBe('10:00');
    expect(minutesSecondes(45)).toBe('0:45');
    expect(minutesSecondes(0)).toBe('0:00');
    expect(minutesSecondes(61)).toBe('1:01');
  });
});
