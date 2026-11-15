/**
 * La photo du plat suit la composition du repas, pas un souvenir du choix.
 * Règle : tous les ingrédients du plat présents → reconnu.
 */
import { describe, expect, it } from 'vitest';
import { BIBLIOTHEQUE_REPAS } from '../data/bibliothequeRepas';
import { repasReconnu } from './repasReconnu';

const bol = BIBLIOTHEQUE_REPAS.find((r) => r.id === 'skyr-fruits-rouges-amandes')!;
const lignes = bol.lignes.map((l) => ({ ...l }));

describe('repasReconnu', () => {
  it('reconnaît le plat posé tel quel', () => {
    expect(repasReconnu('pdej', lignes)?.id).toBe(bol.id);
  });

  it('les quantités ne comptent pas', () => {
    expect(
      repasReconnu(
        'pdej',
        lignes.map((l) => ({ ...l, qty: (l.qty ?? 0) * 2 })),
      )?.id,
    ).toBe(bol.id);
    expect(
      repasReconnu(
        'pdej',
        lignes.map((l) => ({ ...l, qty: null })),
      )?.id,
    ).toBe(bol.id);
  });

  it('un aliment ajouté ne l’efface pas', () => {
    expect(repasReconnu('pdej', [...lignes, { foodId: 'banane', qty: 1 }])?.id).toBe(bol.id);
  });

  it('un ingrédient remplacé ou retiré l’efface', () => {
    const sansSkyr = lignes.filter((l) => l.foodId !== 'skyr');
    expect(repasReconnu('pdej', sansSkyr)).toBeNull();
    expect(repasReconnu('pdej', [...sansSkyr, { foodId: 'fromageBlanc', qty: 200 }])?.id).not.toBe(
      bol.id,
    );
  });

  it('seuls les plats du créneau sont candidats', () => {
    // Le bol du matin n'est pas proposé au déjeuner.
    expect(bol.creneaux).not.toContain('dejeuner');
    expect(repasReconnu('dejeuner', lignes)).toBeNull();
  });

  it('repas vide : rien', () => {
    expect(repasReconnu('pdej', [])).toBeNull();
  });

  it('chaque plat de la bibliothèque se reconnaît LUI-MÊME sur chacun de ses créneaux', () => {
    // Aucun plat n'en contient un autre du même créneau : aucun ne masque sa
    // photo. Un plat ajouté qui en engloberait un autre ferait tomber ce test.
    for (const r of BIBLIOTHEQUE_REPAS)
      for (const c of r.creneaux)
        expect(repasReconnu(c, r.lignes)?.id, `${r.id} / ${c}`).toBe(r.id);
  });
});
