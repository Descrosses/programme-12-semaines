import { describe, expect, it } from 'vitest';
import {
  comparable,
  DISTANCE_UNITS,
  hasUnitChoice,
  isUnitId,
  lastMeasureIn,
  lastUnitUsed,
  unitConfig,
  unitOf,
  UNIT_CHOICE,
  UNIT_DEFAULT,
  valueForUnit,
} from './measureUnit';

describe('unitOf', () => {
  it('lit l’unité telle qu’elle a été saisie', () => {
    expect(unitOf({ measureUnit: 'pas' })).toBe('pas');
    expect(unitOf({ measureUnit: 'm' })).toBe('m');
  });

  it('replie une ligne ancienne sur les mètres — c’était la seule possibilité', () => {
    expect(unitOf({})).toBe('m');
    expect(unitOf({ measureUnit: null })).toBe('m');
    expect(unitOf({ measureUnit: undefined })).toBe('m');
  });

  it('refuse une unité inconnue plutôt que de l’afficher', () => {
    expect(unitOf({ measureUnit: 'yards' })).toBe('m');
    expect(isUnitId('yards')).toBe(false);
    expect(isUnitId('pas')).toBe(true);
  });
});

describe('hasUnitChoice', () => {
  it('propose le choix sur les mouvements chiffrés en mètres', () => {
    expect(hasUnitChoice('m')).toBe(true);
  });

  it('ne le propose nulle part ailleurs — « pas » n’a pas de sens en cm ou en s', () => {
    expect(hasUnitChoice('cm')).toBe(false);
    expect(hasUnitChoice('s')).toBe(false);
    expect(hasUnitChoice(null)).toBe(false);
    expect(hasUnitChoice(undefined)).toBe(false);
  });
});

describe('lastUnitUsed', () => {
  const o = (measure: number | null, measureUnit?: string) => ({ measure, measureUnit });

  it('présélectionne la dernière unité réellement utilisée', () => {
    expect(lastUnitUsed([o(12, 'm'), o(18, 'pas')])).toBe('pas');
    expect(lastUnitUsed([o(18, 'pas'), o(12, 'm')])).toBe('m');
  });

  it('saute les occurrences sans mesure', () => {
    expect(lastUnitUsed([o(18, 'pas'), o(null), o(null)])).toBe('pas');
  });

  it('retombe sur les mètres sans historique — c’est ce que le programme prescrit', () => {
    expect(lastUnitUsed([])).toBe('m');
    expect(lastUnitUsed(undefined)).toBe('m');
    expect(lastUnitUsed([o(null)])).toBe('m');
    expect(UNIT_DEFAULT).toBe('m');
  });
});

describe('comparable', () => {
  it('deux mètres se comparent', () => {
    expect(comparable({ measureUnit: 'm' }, { measureUnit: 'm' })).toBe(true);
  });

  it('un mètre ne se compare JAMAIS à un pas', () => {
    expect(comparable({ measureUnit: 'm' }, { measureUnit: 'pas' })).toBe(false);
    expect(comparable({ measureUnit: 'pas' }, { measureUnit: 'm' })).toBe(false);
  });

  it('une ligne ancienne se compare aux mètres, pas aux pas', () => {
    expect(comparable({}, { measureUnit: 'm' })).toBe(true);
    expect(comparable({}, { measureUnit: 'pas' })).toBe(false);
  });
});

describe('valueForUnit — rien n’est converti', () => {
  it('reprend la dernière valeur enregistrée DANS cette unité', () => {
    expect(valueForUnit('pas', { lastInUnit: 18, plannedMeters: 12 })).toBe(18);
  });

  it('revient au plan quand on revient aux mètres', () => {
    expect(valueForUnit('m', { lastInUnit: null, plannedMeters: 12 })).toBe(12);
  });

  it('ne reporte jamais la valeur de l’autre unité', () => {
    // 12 m ne devient pas 12 pas : on repart du minimum du curseur, pas
    // d'un chiffre que personne n'a fait.
    expect(valueForUnit('pas', { lastInUnit: null, plannedMeters: 12 })).toBe(
      DISTANCE_UNITS.pas.min,
    );
  });

  it('retombe sur le minimum du curseur quand il n’y a rien', () => {
    expect(valueForUnit('m', {})).toBe(DISTANCE_UNITS.m.min);
    expect(valueForUnit('pas', {})).toBe(DISTANCE_UNITS.pas.min);
  });
});

describe('lastMeasureIn', () => {
  const o = (measure: number | null, measureUnit?: string) => ({ measure, measureUnit });

  it('ne regarde que les séries de l’unité demandée', () => {
    const occ = [o(12, 'm'), o(18, 'pas'), o(14, 'm')];
    expect(lastMeasureIn(occ, 'm')).toBe(14);
    expect(lastMeasureIn(occ, 'pas')).toBe(18);
  });

  it('rend null plutôt qu’une valeur d’une autre unité', () => {
    expect(lastMeasureIn([o(12, 'm')], 'pas')).toBeNull();
    expect(lastMeasureIn([], 'm')).toBeNull();
  });
});

describe('configuration des curseurs', () => {
  it('les deux unités sont proposées, mètres d’abord', () => {
    expect(UNIT_CHOICE.map((u) => u.id)).toEqual(['m', 'pas']);
  });

  it('les pas montent plus haut que les mètres', () => {
    expect(unitConfig('pas').max).toBeGreaterThan(unitConfig('m').max);
  });

  it('chaque unité nomme son champ, et jamais deux fois la même chose', () => {
    // Le curseur affiche « <intitulé> · <unité> » : « Distance · pas » se
    // lisait de travers, et « Pas · pas » encore plus mal.
    expect(unitConfig('m').fieldLabel).toBe('Distance');
    expect(unitConfig('pas').fieldLabel).toBe('Nombre');
    for (const u of UNIT_CHOICE) {
      expect(u.fieldLabel.toLowerCase()).not.toBe(u.label.toLowerCase());
    }
  });

  it('aucun curseur ne démarre à zéro — une série de zéro n’existe pas', () => {
    for (const u of UNIT_CHOICE) expect(u.min).toBeGreaterThan(0);
  });
});
