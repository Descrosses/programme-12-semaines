/**
 * Les couleurs des macros (glucides, protéines, lipides) — variante
 * « Relief » choisie par Guillaume le 27 novembre (« go B, MASS suit aussi ») :
 * les teintes d'avant « paraissaient ternes ».
 *
 * Ce que ce test fige :
 * - POWER et MASS : les trois teintes vives, lisibles en remplissage (3:1 au
 *   moins sur chaque fond), et le relief (dégradé, liseré, 10 px) ;
 * - LADIES, ME, MYSELF & I et la plateforme : leur palette, À PLAT — elles
 *   remettent chaque jeton « relief » à zéro (sinon elles héritent de :root) ;
 * - les barres lisent leurs jetons : aucune règle de thème dans les écrans ;
 * - un dépassement ne se dit plus par la couleur seule.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lire = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
const css = lire('./tokens.css');
const bloc = (entete: string) => {
  const debut = css.indexOf(entete);
  if (debut < 0) throw new Error(`${entete} introuvable`);
  return css.slice(debut, css.indexOf('\n}\n', debut));
};
const valeur = (b: string, nom: string) => {
  const m = new RegExp(`\\n\\s*--${nom}:\\s*([^;]+);`).exec(b);
  return m ? m[1]!.trim() : null;
};
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contraste = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

const POWER = bloc(":root,\n[data-theme='power'] {");
const MASS = bloc("[data-theme='mass'] {");
const MACROS = ['glucides', 'proteines', 'lipides'] as const;
const VIVES = { glucides: '#45a6ff', proteines: '#ff5e9c', lipides: '#f2c230' };
const RELIEF = [
  'macro-glucides-relief',
  'macro-proteines-relief',
  'macro-lipides-relief',
  'macro-liseret',
  'macro-piste-ombre',
  'macro-epaisseur',
  'macro-espace',
];

describe('macros « Relief » : POWER et MASS', () => {
  it('les trois teintes vives, les mêmes sous POWER et sous MASS', () => {
    for (const m of MACROS) {
      expect(valeur(POWER, `macro-${m}`), `POWER ${m}`).toBe(VIVES[m]);
      expect(valeur(MASS, `macro-${m}`), `MASS ${m}`).toBe(VIVES[m]);
    }
  });

  for (const [nom, b] of [
    ['POWER', POWER],
    ['MASS', MASS],
  ] as const) {
    it(`${nom} : chaque teinte tient 3:1 en remplissage sur tous les fonds`, () => {
      for (const fond of ['bg', 'bg-2', 'surface', 'surface-2', 'surface-3']) {
        for (const m of MACROS) {
          expect(
            contraste(VIVES[m], valeur(b, fond)!),
            `${m} sur --${fond}`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    });
  }

  it('le relief : un dégradé par teinte, un liseré, une barre de 10 px', () => {
    for (const m of MACROS) {
      expect(valeur(POWER, `macro-${m}-relief`), m).toMatch(/^linear-gradient\(180deg, #/);
    }
    expect(valeur(POWER, 'macro-liseret')).toContain('inset 0 1px 0');
    expect(valeur(POWER, 'macro-epaisseur')).toBe('10px');
    // MASS ne redéfinit pas le relief : il l'hérite de :root.
    for (const j of RELIEF) expect(valeur(MASS, j), `MASS --${j}`).toBeNull();
  });

  it('le dégradé reste lisible à son plus sombre (3:1 sur la carte)', () => {
    for (const m of MACROS) {
      const bas = /#[0-9a-f]{6} 100%/i.exec(valeur(POWER, `macro-${m}-relief`)!)![0].slice(0, 7);
      expect(contraste(bas, valeur(POWER, 'surface')!), `POWER ${m}`).toBeGreaterThanOrEqual(3);
      expect(contraste(bas, valeur(MASS, 'surface')!), `MASS ${m}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('les autres thèmes gardent leur palette, à plat', () => {
  const AUTRES = {
    LADIES: bloc("[data-theme='femmes'] {"),
    'ME, MYSELF & I': bloc("[data-theme='perso'] {"),
    plateforme: bloc("[data-theme='dcross'] {"),
  };

  for (const [nom, b] of Object.entries(AUTRES)) {
    it(`${nom} : ses trois teintes à lui, et aucun relief hérité`, () => {
      for (const m of MACROS) {
        const teinte = valeur(b, `macro-${m}`);
        expect(teinte, `${nom} ${m}`).toMatch(/^#[0-9a-f]{6}$/);
        expect(teinte, `${nom} ${m}`).not.toBe(VIVES[m]);
        expect(valeur(b, `macro-${m}-relief`), `${nom} ${m}`).toBe(`var(--macro-${m})`);
      }
      expect(valeur(b, 'macro-liseret')).toBe('none');
      expect(valeur(b, 'macro-piste-ombre')).toBe('none');
      expect(valeur(b, 'macro-epaisseur')).toBe('8px');
      expect(valeur(b, 'macro-espace')).toBe('2px');
    });
  }

  it('LADIES (fond clair) : ses teintes tiennent 3:1 sur le fond et la carte', () => {
    const b = AUTRES.LADIES;
    for (const m of MACROS) {
      for (const fond of ['bg', 'surface']) {
        expect(
          contraste(valeur(b, `macro-${m}`)!, valeur(b, fond)!),
          `${m} sur --${fond}`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('les barres lisent les jetons', () => {
  const ecrans = lire('../screens/Screens.module.css');
  const reste = lire('../components/ResteDuJour.module.css');

  it('composition d’un repas, progression du plan, « Il te reste »', () => {
    for (const m of MACROS) {
      const lu = `var(--macro-${m}-relief, var(--macro-${m}))`;
      expect(ecrans, m).toContain(lu);
      expect(reste, m).toContain(lu);
    }
    expect(ecrans).toContain('height: var(--macro-epaisseur, 8px);');
    expect(reste).toContain('height: var(--macro-epaisseur, 8px);');
    expect(ecrans.match(/box-shadow: var\(--macro-liseret, none\);/g)).toHaveLength(2);
    expect(reste).toContain('box-shadow: var(--macro-liseret, none);');
  });

  it('un dépassement se dit par un motif, pas par la couleur seule', () => {
    const i = ecrans.indexOf('.progressOver {');
    expect(ecrans.slice(i, ecrans.indexOf('}', i))).toContain('repeating-linear-gradient(');
  });
});
