/**
 * §6 — Échauffements, transformés en listes cochables (défaut n°12 du prototype).
 * Chaque `id` est stable : c'est ce qu'on stocke dans `sessions.warmupChecked`.
 */

import type { Warmup } from './types';

export const WARMUP_LOWER: Warmup = {
  id: 'lower',
  durationLabel: '8-10 min',
  items: [
    { id: 'wl-velo', label: 'Vélo', detail: '3 min' },
    { id: 'wl-ankle', label: 'Ankle rocks', detail: '10 / côté' },
    { id: 'wl-9090', label: '90/90 hip switch', detail: '× 8' },
    { id: 'wl-adductor', label: 'Adductor rockback', detail: '× 8' },
    { id: 'wl-glute', label: 'Glute bridge', detail: '× 10' },
    { id: 'wl-squat', label: 'Squat poids du corps', detail: '× 10' },
    { id: 'wl-ramp', label: 'Montées de charge', detail: 'jusqu’à la charge du jour' },
  ],
};

export const WARMUP_UPPER: Warmup = {
  id: 'upper',
  durationLabel: '7-9 min',
  items: [
    { id: 'wu-rameur', label: 'Rameur', detail: '3 min' },
    { id: 'wu-pullapart', label: 'Band pull-apart', detail: '× 15' },
    { id: 'wu-scap', label: 'Scap push-up', detail: '× 10' },
    { id: 'wu-rotext', label: 'Rotation externe câble', detail: '12 / côté' },
    { id: 'wu-pompes', label: 'Pompes', detail: '× 8' },
    { id: 'wu-ramp', label: 'Montées de charge', detail: 'jusqu’à la charge du jour' },
  ],
};

export const WARMUPS = { lower: WARMUP_LOWER, upper: WARMUP_UPPER } as const;
