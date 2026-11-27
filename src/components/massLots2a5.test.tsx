/**
 * Lots 2 à 5 de `regles-nutrition-mass.md` (Guillaume, 27 novembre, « go MASS
 * lot 2-3-4-5 ») : collations à boire, remplacement à apport égal, repères
 * d'horaires, carte « Créatine ». Le `.md` fait foi : ses tableaux et ses
 * textes sont relus ici et comparés au code, mot pour mot.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BIBLIOTHEQUE_REPAS, repasPourCreneau } from '../data/bibliothequeRepas';
import { CREATINE } from '../data/creatine';
import { FOOD_LIBRARY } from '../data/foodLibrary';
import { MACRO_CONSERVEE, REPERES_HORAIRES_MASS } from '../data/reglesNutritionMass';
import { rayonDe } from '../engine/courses';
import { quantiteEnMots, quantiteEquivalente } from '../engine/equivalence';
import { alimentsExclus, repasExclu } from '../engine/exclusionsRepas';
import { macrosDeLigne } from '../engine/planPersoTotaux';
import { ajusterRepas, composerSemaine, tientSaPart } from '../engine/semaineRepas';
import { ReperesHoraires } from '../screens/NutritionPrincipesScreen';
import { CarteCreatine } from './CarteCreatine';
import { LigneAliment } from './PlanPerso';
import { VignetteRepas } from './VignetteRepas';

const lire = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
const md = lire('../../regles-nutrition-mass.md');
const texte = (h: string) =>
  h
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');
/** Apostrophes droites, sans gras ni retours : pour comparer un texte au `.md`. */
const plat = (t: string) => t.replace(/’/g, "'").replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();

function tableau(entete: string): string[][] {
  const lignes = md.split('\n');
  const i = lignes.findIndex((l) => l.startsWith(`| ${entete}`));
  expect(i, entete).toBeGreaterThan(-1);
  const out: string[][] = [];
  for (const l of lignes.slice(i + 2)) {
    if (!l.startsWith('|')) break;
    out.push(
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
  }
  return out;
}

/** Une section du `.md`, de son titre « ## n. » au suivant. */
const section = (n: number) => {
  const debut = md.indexOf(`\n## ${String(n)}. `);
  return md.slice(debut, md.indexOf('\n## ', debut + 4));
};

// --------------------------------------------------------------- lot 2 ----
describe('lot 2 — les collations à boire', () => {
  const A_BOIRE = BIBLIOTHEQUE_REPAS.filter((r) => r.nom.startsWith('À boire : '));

  it('quatre, deux avec whey et deux sans — le tableau du .md, ligne par ligne', () => {
    const t = tableau('Collation à boire');
    expect(A_BOIRE).toHaveLength(4);
    expect(t.map((l) => l[0])).toEqual(
      A_BOIRE.map((r) =>
        plat(r.nom.replace('À boire : ', '')).replace(/^./, (c) => c.toUpperCase()),
      ),
    );
    // Les quantités de référence : « avoine 60 g, whey 30 g, banane 1 ».
    const ID: Record<string, string> = {
      avoine: 'avoine',
      whey: 'whey',
      banane: 'banane',
      lait: 'lait',
      'beurre de cacahuète': 'beurreCacahuete',
      skyr: 'skyr',
      'fruits rouges': 'fruitsRouges',
      amandes: 'amandes',
    };
    A_BOIRE.forEach((r, i) => {
      const lus = t[i]![1]!.split(',').map((x) => {
        const m = /^(.*?) (\d+)(?: (?:g|ml))?$/.exec(x.trim())!;
        return { foodId: ID[m[1]!]!, qty: Number(m[2]) };
      });
      expect(lus, r.id).toEqual(r.lignes);
    });
    expect(A_BOIRE.filter((r) => r.lignes.some((l) => l.foodId === 'whey'))).toHaveLength(2);
  });

  it('aux collations seulement — matin, après-midi et soir, jamais petit-déjeuner ni plat', () => {
    for (const r of A_BOIRE)
      expect([...r.creneaux].sort(), r.id).toEqual(['collation1', 'collation2']);
    const ids = (c: Parameters<typeof repasPourCreneau>[0]) => repasPourCreneau(c).map((r) => r.id);
    for (const r of A_BOIRE) {
      expect(ids('collation3'), r.id).toContain(r.id);
      for (const c of ['pdej', 'dejeuner', 'diner'] as const) expect(ids(c)).not.toContain(r.id);
    }
  });

  it('rien que des aliments qui se mixent ou se secouent', () => {
    const boire = new Set([
      'avoine',
      'whey',
      'banane',
      'lait',
      'beurreCacahuete',
      'skyr',
      'fruitsRouges',
      'amandes',
    ]);
    for (const r of A_BOIRE)
      for (const l of r.lignes) expect(boire.has(l.foodId), l.foodId).toBe(true);
  });

  it('aucun repas d’un même créneau n’a exactement les mêmes aliments qu’un autre', () => {
    // Sinon la vignette et le nom du plat (`repasReconnu`) seraient ambigus.
    for (const c of ['pdej', 'collation1', 'collation2', 'dejeuner', 'diner'] as const) {
      const cles = repasPourCreneau(c).map((r) =>
        r.lignes
          .map((l) => l.foodId)
          .sort()
          .join('+'),
      );
      expect(new Set(cles).size, c).toBe(cles.length);
    }
  });

  it('elles servent aux grosses cibles : toutes tiennent leur part de 2 400 à 4 000 kcal', () => {
    for (const kcal of [2400, 3000, 3600, 4000]) {
      const cible = { kcal, proteinG: Math.round(kcal * 0.055) };
      for (const part of [0.15, 0.125]) {
        for (const r of A_BOIRE) {
          expect(
            tientSaPart(ajusterRepas(r, part, cible, FOOD_LIBRARY), part, cible, FOOD_LIBRARY),
            `${r.id} à ${String(kcal)} kcal, part ${String(part)}`,
          ).toBe(true);
        }
      }
    }
  });

  it('sécurité : la whey est du lait — écartée avec les laitiers, et les quatre avec le gluten', () => {
    const sansLait = alimentsExclus(['laitiers']);
    expect(sansLait.has('whey')).toBe(true);
    for (const r of A_BOIRE) {
      expect(repasExclu(r, sansLait), `${r.id} sans laitiers`).toBe(true);
      expect(repasExclu(r, alimentsExclus(['gluten'])), `${r.id} sans gluten`).toBe(true);
    }
    const semaine = composerSemaine(
      { kcal: 3200, proteinG: 180 },
      [],
      FOOD_LIBRARY,
      '2026-11-27',
      sansLait,
      5,
    );
    expect(JSON.stringify(semaine.jours)).not.toMatch(/"whey"|"lait"|"skyr"/);
  });

  it('courses : la whey à l’épicerie, pas au rayon des viandes', () => {
    expect(rayonDe('whey', FOOD_LIBRARY)).toBe('epicerie');
    expect(rayonDe('poulet', FOOD_LIBRARY)).toBe('viandes');
  });

  it('photo à venir : une vignette neutre, jamais une image cassée', () => {
    for (const r of A_BOIRE) expect(r.photoAVenir, r.id).toBe(true);
    const petite = renderToStaticMarkup(<VignetteRepas repas={A_BOIRE[0]!} className="x" />);
    expect(petite).toContain('data-photo-a-venir');
    expect(petite).not.toContain('<img');
    const grande = renderToStaticMarkup(
      <VignetteRepas repas={A_BOIRE[0]!} className="x" alt={A_BOIRE[0]!.nom} grande />,
    );
    expect(texte(grande)).toContain('Photo à venir');
    expect(grande).toContain('role="img"');
    // Un repas photographié garde son image.
    const photo = renderToStaticMarkup(
      <VignetteRepas repas={BIBLIOTHEQUE_REPAS[0]!} className="x" />,
    );
    expect(photo).toContain(`repas/${BIBLIOTHEQUE_REPAS[0]!.id}.webp`);
    expect(photo).not.toContain('data-photo-a-venir');
  });
});

// --------------------------------------------------------------- lot 3 ----
describe('lot 3 — remplacer un aliment à apport égal', () => {
  const eq = (a: string, q: number | null, n: string) => quantiteEquivalente(a, q, n, FOOD_LIBRARY);
  const apport = (id: string, qty: number) => macrosDeLigne({ foodId: id, qty }, FOOD_LIBRARY);

  it('ce que la quantité conserve, groupe par groupe — le tableau du .md', () => {
    const t = tableau('Groupe de l');
    const lu = (c: string) =>
      c.includes('protéines')
        ? 'proteinG'
        : c.includes('glucides')
          ? 'carbsG'
          : c.includes('lipides')
            ? 'fatG'
            : null;
    expect(t.map((l) => lu(l[1]!))).toEqual([
      MACRO_CONSERVEE.proteines,
      MACRO_CONSERVEE.glucides,
      MACRO_CONSERVEE.lipides,
      MACRO_CONSERVEE.vegetaux,
    ]);
    expect(t[3]![1]).toBe('la quantité, inchangée');
  });

  it('l’exemple du .md : 150 g de poulet cuit → 210 g de poisson blanc cuit', () => {
    expect(section(7)).toContain('150 g de poulet cuit');
    expect(section(7)).toContain('210 g de poisson blanc cuit');
    expect(eq('poulet', 150, 'poissonBlanc')).toEqual({ qty: 210, conserve: 'protéines' });
    expect(apport('poulet', 150).proteinG).toBeCloseTo(46.5, 5);
  });

  it('l’apport est conservé à un arrondi près, dans les trois groupes', () => {
    const cas: [string, number, string, 'proteinG' | 'carbsG' | 'fatG'][] = [
      ['poulet', 150, 'saumon', 'proteinG'],
      ['boeuf', 180, 'thon', 'proteinG'],
      ['skyr', 200, 'fromageBlanc', 'proteinG'],
      ['riz', 250, 'pates', 'carbsG'],
      ['riz', 250, 'pommesDeTerre', 'carbsG'],
      ['avoine', 60, 'pain', 'carbsG'],
      ['huile', 10, 'amandes', 'fatG'],
      ['beurreCacahuete', 20, 'noix', 'fatG'],
    ];
    for (const [a, q, n, macro] of cas) {
      const r = eq(a, q, n)!;
      expect(r, `${a} → ${n}`).not.toBeNull();
      const [avant, apres] = [apport(a, q)[macro], apport(n, r.qty)[macro]];
      // Un cran d'arrondi (5 g) du nouvel aliment, au plus.
      const cran = (FOOD_LIBRARY[n]![macro] / FOOD_LIBRARY[n]!.per) * 5;
      expect(
        Math.abs(apres - avant),
        `${a} ${String(q)} → ${n} ${String(r.qty)}`,
      ).toBeLessThanOrEqual(cran / 2 + 1e-9);
      expect(r.qty % 5).toBe(0);
    }
  });

  it('une pièce reste entière, dans un sens comme dans l’autre', () => {
    // 3 œufs = 18,9 g de protéines → 60 g de poulet cuit (18,6 g).
    expect(eq('oeuf', 3, 'poulet')).toEqual({ qty: 60, conserve: 'protéines' });
    // 150 g de poulet = 46,5 g → 7 œufs (44,1 g) ; jamais 7,4.
    expect(eq('poulet', 150, 'oeuf')).toEqual({ qty: 7, conserve: 'protéines' });
    // Jamais zéro pièce.
    expect(eq('poulet', 5, 'oeuf')!.qty).toBe(1);
  });

  it('rien à convertir : groupes différents, fruits et légumes, quantité non posée', () => {
    expect(eq('poulet', 150, 'riz')).toBeNull(); // protéines → glucides
    expect(eq('riz', 250, 'huile')).toBeNull();
    expect(eq('brocolisCuits', 150, 'haricotsVerts')).toBeNull(); // la quantité, inchangée
    expect(eq('banane', 1, 'pomme')).toBeNull();
    expect(eq('poulet', null, 'saumon')).toBeNull();
    expect(eq('poulet', 0, 'saumon')).toBeNull();
    expect(eq('poulet', 150, 'poulet')).toBeNull();
    expect(eq('poulet', 150, 'inconnu')).toBeNull();
    expect(eq('inconnu', 150, 'poulet')).toBeNull();
    // Un aliment sans la macro de son groupe : jamais de division par zéro.
    const cat = { ...FOOD_LIBRARY, vide: { ...FOOD_LIBRARY.poulet!, id: 'vide', proteinG: 0 } };
    expect(quantiteEquivalente('poulet', 150, 'vide', cat)).toBeNull();
    expect(quantiteEquivalente('vide', 150, 'poulet', cat)).toBeNull();
  });

  it('l’écran dit d’où vient la quantité, et l’oublie dès qu’on la règle à la main', () => {
    expect(quantiteEnMots(210, 'g')).toBe('210 g');
    expect(quantiteEnMots(250, 'ml')).toBe('250 ml');
    expect(quantiteEnMots(1, 'unité')).toBe('1 unité');
    expect(quantiteEnMots(7, 'unité')).toBe('7 unités');
    const src = lire('./PlanPerso.tsx');
    expect(src).toContain('quantiteEquivalente(x.foodId, x.qty, nouveau, catalogue)');
    // Le nouvel aliment déjà dans le repas : sa ligne garde SA quantité.
    expect(src).toMatch(/lignes\.some\(\(l\) => l\.foodId === nouveau\)\s*\?\s*null/);
    expect(src).toContain('poserQuantite(remplacee, repas.id, nouveau, eq.qty)');
    expect(src).toMatch(/onQty=\{\(v\) => \{[\s\S]{0,300}?setEquivalence\(null\);/);
    const ligne = (note?: string) =>
      renderToStaticMarkup(
        <LigneAliment
          food={FOOD_LIBRARY.poissonBlanc!}
          qty={210}
          kcal={210}
          horsListe={false}
          ouverte
          ouvertEnRemplacement={false}
          customs={[]}
          onToggle={() => {}}
          onQty={() => {}}
          onRetirer={() => {}}
          onRemplacer={() => {}}
          onChoisi={() => {}}
          onCreateCustom={() => {}}
          onFermerRemplacement={() => {}}
          {...(note === undefined ? {} : { note })}
        />,
      );
    expect(ligne()).not.toContain('data-equivalence');
    const h = ligne(
      'Quantité proposée : 210 g, pour les mêmes protéines que 150 g de Poulet cuit. Tu peux la changer.',
    );
    expect(h).toContain('data-equivalence');
    // La phrase affichée est celle que le .md annonce.
    expect(plat(section(7))).toContain(
      'Quantité proposée : 210 g, pour les mêmes protéines que 150 g de Poulet cuit. Tu peux la changer.',
    );
  });
});

// --------------------------------------------------------------- lot 4 ----
describe('lot 4 — les repères d’horaires', () => {
  it('les deux phrases du .md, mot pour mot', () => {
    expect(REPERES_HORAIRES_MASS).toHaveLength(2);
    for (const r of REPERES_HORAIRES_MASS) expect(plat(section(8))).toContain(`« ${plat(r)} »`);
    const h = renderToStaticMarkup(<ReperesHoraires />);
    expect(h).toContain('data-reperes-horaires');
    for (const r of REPERES_HORAIRES_MASS) expect(plat(texte(h))).toContain(plat(r));
  });

  it('sous MASS seulement, en bas d’écran — ni POWER ni LADIES', () => {
    expect(lire('../screens/NutritionPrincipesScreen.tsx')).toContain(
      'apres={<ReperesHoraires />}',
    );
    for (const f of ['../App.tsx', '../screens/femmes/NutritionFemmes.tsx']) {
      expect(lire(f), f).not.toContain('ReperesHoraires');
    }
  });
});

// --------------------------------------------------------------- lot 5 ----
describe('lot 5 — la carte « Créatine »', () => {
  /** Le texte validé : la citation indentée du §11, paragraphe par paragraphe. */
  const cite = section(11)
    .split('\n')
    .filter((l) => l.startsWith('  >'))
    .map((l) => l.slice(3).trim())
    .join('\n')
    .split(/\n\n+/)
    .map(plat);

  it('le texte validé par Guillaume, mot pour mot', () => {
    expect(cite[0]).toBe(CREATINE.titre);
    const code = CREATINE.paragraphes.map((p) =>
      plat(p.map((m) => (typeof m === 'string' ? m : m.gras)).join('')),
    );
    expect(code).toEqual(cite.slice(1));
    expect(code).toHaveLength(4);
    // Le gras du .md est celui de l'écran.
    const gras = CREATINE.paragraphes.flatMap((p) =>
      p.flatMap((m) => (typeof m === 'string' ? [] : [m.gras])),
    );
    expect(gras).toEqual(['3 à 5 g par jour, tous les jours', 'monohydrate']);
    for (const g of gras) expect(section(11)).toContain(`**${g}**`);
  });

  it('aucune marque, aucun lien, aucun code promo', () => {
    const tout = JSON.stringify(CREATINE).toLowerCase();
    for (const interdit of ['http', 'www', '.com', 'code', 'promo', '%', 'creapure', 'favre']) {
      expect(tout, interdit).not.toContain(interdit);
    }
    expect(tout).toContain('majk ne recommande aucune marque');
  });

  it('repliée : le titre seul — jamais la dose sans la phrase de prudence', () => {
    const repliee = renderToStaticMarkup(<CarteCreatine />);
    expect(repliee).toContain('data-creatine');
    expect(repliee).toContain('aria-expanded="false"');
    expect(texte(repliee)).not.toContain('3 à 5 g');
    expect(texte(repliee)).not.toContain('médecin');
    const ouverte = texte(renderToStaticMarkup(<CarteCreatine ouverteParDefaut />));
    expect(ouverte).toContain('3 à 5 g par jour, tous les jours');
    expect(ouverte).toContain('NF EN 17444');
    expect(plat(ouverte)).toContain("Demande l'avis de ton médecin avant d'en prendre");
    // Ouverte, les quatre paragraphes sont là d'un bloc.
    expect(ouverte.indexOf('3 à 5 g')).toBeLessThan(ouverte.indexOf('médecin'));
  });

  it('sous POWER et MASS seulement — jamais LADIES, jamais dans le plan historique', () => {
    expect(lire('../App.tsx')).toMatch(/<NutritionScreen[\s\S]{0,700}?\bcreatine\b/);
    expect(lire('../screens/NutritionPrincipesScreen.tsx')).toMatch(
      /<NutritionScreen[\s\S]*?\bcreatine\b/,
    );
    expect(lire('../screens/femmes/NutritionFemmes.tsx')).not.toMatch(/creatine/i);
    const ecran = lire('../screens/NutritionScreen.tsx');
    expect(ecran.match(/<CarteCreatine/g)).toHaveLength(1);
    // Elle est rendue dans le chemin SANS menus : avant le plan historique.
    expect(ecran.indexOf('{creatine && <CarteCreatine />}')).toBeGreaterThan(-1);
    expect(ecran.indexOf('{creatine && <CarteCreatine />}')).toBeLessThan(
      ecran.indexOf('La phase de la journée'),
    );
    // Les principes de CONGESTION ne disent plus « aucun avis » sur les compléments.
    const principes = lire('../screens/NutritionPrincipesScreen.tsx')
      .split('\n')
      .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
      .join('\n');
    expect(principes).not.toContain('aucun avis ici');
  });
});
