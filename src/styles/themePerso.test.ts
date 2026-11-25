/**
 * Le thème ME, MYSELF & I — « ivoire · chocolat · champagne » (maquette de
 * Guillaume, 25 novembre). CLAIR, chaud, et LISIBLE. Ce test relit
 * `tokens.css`, mesure les contrastes WCAG et vérifie ce qui ne se voit pas
 * à l'œil : les commandes natives en clair, l'heure de l'iPhone lisible, le
 * menu inversé, le bloc fiche qui ne montre plus une photo sombre délavée,
 * et les quatre bandeaux photo de Guillaume, chacun à son écran.
 */
import { existsSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import {
  enteteAccueilFixe,
  enteteDe,
  HABILLAGE,
  titresBandeauDe,
  type EcranEntete,
} from '../data/famillesVisuel';
import { VISUELS, type VisuelNom } from '../data/visuels';
import { validerProgramme } from '../engine/perso/valider';
import type { ProgrammeImporteRow } from '../db/db';
import { remplirMemoire, viderMemoire } from '../programmes/perso/memoire';

const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), 'utf8');
const css = lire('./tokens.css');
const bloc = (() => {
  const debut = css.indexOf("\n[data-theme='perso'] {");
  return css.slice(debut, css.indexOf('\n}\n', debut));
})();
const jeton = (nom: string, source = bloc) => {
  const m = new RegExp(`--${nom}:\\s*(#[0-9a-f]{6})`, 'i').exec(source);
  if (!m) throw new Error(`--${nom} absent du thème ME, MYSELF & I`);
  return m[1]!.toLowerCase();
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

describe('thème ME, MYSELF & I — ivoire, chocolat, champagne', () => {
  it('porte les trois couleurs de Guillaume', () => {
    expect(jeton('bg')).toBe('#f5f0e6');
    expect(jeton('accent')).toBe('#49352b');
    expect(jeton('champagne')).toBe('#c5a775');
  });

  it('est clair', () => {
    expect(lum(jeton('bg'))).toBeGreaterThan(0.85);
    expect(lum(jeton('ink'))).toBeLessThan(0.05);
  });

  // Le texte courant se pose sur le fond, sur les cartes et sur leurs creux
  // (curseurs, champs : `--surface-3`, le plus foncé des quatre).
  const fonds = ['bg', 'surface', 'surface-2', 'surface-3'];
  for (const encre of [
    'ink',
    'ink-2',
    'ink-3',
    'accent-ink',
    'vert',
    'orange',
    'rouge',
    'bleu-ink',
  ]) {
    it(`--${encre} tient 4,5:1 sur le fond et les cartes`, () => {
      for (const f of fonds) {
        expect({ f, ok: contraste(jeton(encre), jeton(f)) >= 4.5 }).toEqual({ f, ok: true });
      }
    });
  }

  it('le texte ivoire des boutons tient 4,5:1 sur le chocolat, haut et bas du dégradé', () => {
    for (const fond of ['accent', 'accent-bright', 'accent-deep']) {
      expect(contraste(jeton('ink-on-accent'), jeton(fond))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('le champagne ne porte jamais de texte : il n’est ni encre ni fond de bouton', () => {
    // 2,0:1 sur l'ivoire, 2,3:1 sous du blanc : réservé aux filets.
    const champagne = jeton('champagne');
    expect(contraste(champagne, jeton('bg'))).toBeLessThan(3);
    for (const nom of ['ink', 'ink-2', 'ink-3', 'accent', 'accent-ink', 'accent-ink-fort']) {
      expect({ nom, champagne: jeton(nom) === champagne }).toEqual({ nom, champagne: false });
    }
  });

  it('redéfinit les couleurs d’état (celles de POWER sont faites pour un fond sombre)', () => {
    for (const nom of ['vert', 'orange', 'rouge', 'bleu', 'bleu-ink', 'bloc-test']) {
      expect(() => jeton(nom)).not.toThrow();
    }
  });

  it('passe les commandes natives en clair', () => {
    expect(lire('./global.css')).toMatch(
      /html\[data-theme='perso'\]\s*\{\s*color-scheme:\s*light;/,
    );
  });

  it('tient l’heure de l’iPhone lisible : bande fixe derrière la barre d’état', () => {
    expect(lire('./global.css')).toMatch(
      /html\[data-theme='perso'\] body::before \{[^}]*position: fixed;[^}]*height: env\(safe-area-inset-top, 0px\);[^}]*background: var\(--barre-etat\);/,
    );
    expect(contraste('#ffffff', jeton('barre-etat'))).toBeGreaterThanOrEqual(4.5);
  });

  it('le menu du bas s’inverse : pastille chocolat, écrite en ivoire', () => {
    // Les jetons ivoire de POWER (pastille claire, encre sombre) seraient
    // invisibles sur un fond ivoire.
    const m = /:root\[data-theme='perso'\] \{([^}]*)\}/.exec(css);
    expect(m).not.toBeNull();
    const inverse = m![1]!;
    expect(contraste(jeton('ivoire', inverse), jeton('bg'))).toBeGreaterThanOrEqual(4.5);
    expect(contraste(jeton('encre', inverse), jeton('ivoire', inverse))).toBeGreaterThanOrEqual(
      4.5,
    );
    // Les cases du tempo : encre claire sur chocolat doux.
    expect(
      contraste(jeton('encre', inverse), jeton('ivoire-doux', inverse)),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('chaque règle du thème, dans un fichier partagé, reste confinée au thème', () => {
    for (const f of [
      '../components/ScreenHeader.module.css',
      '../screens/Today.module.css',
      '../screens/Week.module.css',
      '../screens/Session.module.css',
    ]) {
      const source = lire(f);
      expect({ f, present: source.includes("[data-theme='perso']") }).toEqual({
        f,
        present: true,
      });
      // Jamais `[data-theme='perso']` sans `:global(…)` : le module CSS le
      // renommerait et la règle ne s'appliquerait à rien.
      expect({
        f,
        nu: /(^|[^(])\[data-theme='perso'\]/m.test(source),
      }).toEqual({ f, nu: false });
    }
  });

  it('le bloc « Ajouter la fiche » ne montre pas la photo sombre de la famille', () => {
    // `cartePerso` est sombre : sous le voile ivoire elle virait au gris.
    const seance = lire('../screens/Session.module.css');
    expect(seance).toMatch(/:global\(\[data-theme='perso'\]\) \.ficheAmbiance \{\s*display: none;/);
    // Une fiche DÉPOSÉE garde son voile : c'est lui qui détache le bouton.
    expect(seance).toMatch(
      /:global\(\[data-theme='perso'\]\) \.ficheImage \+ \.ficheVoile \{\s*background: rgb\(var\(--voile\) \/ 45%\);/,
    );
  });
});

describe('ME, MYSELF & I — les en-têtes et leurs bandeaux', () => {
  const TEXTE = lire('../engine/perso/__fixtures__/training1.json');
  const CLE = 'perso-training1guillaume201005-1';
  const ligne = (): ProgrammeImporteRow => {
    const v = validerProgramme(TEXTE);
    if (!v.ok) throw new Error('fixture invalide');
    return {
      cle: CLE,
      uid: v.programme.uid,
      rev: 1,
      nom: v.programme.nom,
      importeLe: '2026-11-16',
      archive: false,
      texte: TEXTE,
      document: v.programme,
      reponses: { dureeSemaines: 8 },
    };
  };
  const PHOTOS: VisuelNom[] = ['persoAujourdhui', 'persoSemaine', 'persoProgres', 'persoReglages'];

  afterEach(() => viderMemoire());

  it('Accueil : le titre et le sous-titre du bandeau, le nom du programme dessous', () => {
    remplirMemoire([ligne()]);
    expect(enteteAccueilFixe(CLE, 8, 1)).toEqual({
      marque: 'ME, MYSELF & I',
      titre: 'Aujourd’hui',
      sous: 'Ma séance du jour',
      // Le nom importé est écrit tel quel (texte verbatim).
      detail: 'Training 1 · semaine 1 / 8',
    });
  });

  it('avant le début du cycle : le nom seul, jamais « semaine null »', () => {
    remplirMemoire([ligne()]);
    expect(enteteAccueilFixe(CLE, 8, null)?.detail).toBe('Training 1');
  });

  it('MASS garde le nom du cycle en titre, POWER et LADIES n’ont pas cet en-tête', () => {
    expect(enteteAccueilFixe('mass-force', 4, 1)).toEqual({
      marque: 'MASS',
      titre: 'MASS FORCE',
      sous: 'Semaine 1 / 4',
    });
    expect(enteteAccueilFixe('power12', 12, 4)).toBeNull();
    expect(enteteAccueilFixe('femmes8', 8, 1)).toBeNull();
  });

  it('les sous-titres sont ceux des bandeaux de Guillaume, mot pour mot', () => {
    remplirMemoire([ligne()]);
    const sous = (e: EcranEntete) => titresBandeauDe(CLE, e);
    expect(sous('semaine')).toEqual({ marque: 'ME, MYSELF & I', sous: 'Mon programme' });
    expect(sous('progres')).toEqual({ marque: 'ME, MYSELF & I', sous: 'Mes évolutions' });
    expect(sous('reglages')).toEqual({ marque: 'ME, MYSELF & I', sous: 'Mon programme' });
    // Les autres familles gardent leurs sous-titres.
    for (const id of ['power12', 'mass4', 'mass-force', 'femmes8']) {
      for (const e of ['accueil', 'semaine', 'progres', 'reglages'] as const) {
        expect({ id, e, t: titresBandeauDe(id, e) }).toEqual({ id, e, t: null });
      }
    }
  });

  it('quatre bandeaux, chacun à son écran ; la séance n’en a pas (aucun fourni)', () => {
    remplirMemoire([ligne()]);
    expect(enteteDe(CLE, 'accueil')).toBe('persoAujourdhui');
    expect(enteteDe(CLE, 'semaine')).toBe('persoSemaine');
    expect(enteteDe(CLE, 'progres')).toBe('persoProgres');
    expect(enteteDe(CLE, 'reglages')).toBe('persoReglages');
    expect(enteteDe(CLE, 'seance')).toBeUndefined();
  });

  it('les deux tailles de chacun existent, sous un nom à elles', () => {
    for (const nom of PHOTOS) {
      for (const f of [VISUELS[nom].display, VISUELS[nom].mobile]) {
        expect(f).toMatch(/^6\d_perso_/);
        expect(existsSync(new URL(`../../public/visuels/${f}`, import.meta.url)), f!).toBe(true);
      }
    }
  });

  it('une image ne passe jamais d’une famille à l’autre', () => {
    for (const famille of ['power', 'mass', 'femmes'] as const) {
      const autres = Object.values(HABILLAGE[famille].entetes ?? {});
      for (const nom of PHOTOS) expect(autres).not.toContain(nom);
    }
    const siennes = Object.values(HABILLAGE.perso.entetes ?? {});
    expect([...siennes].sort()).toEqual([...PHOTOS].sort());
    for (const id of ['power12', 'mass4', 'mass-force', 'femmes8']) {
      for (const e of ['accueil', 'semaine', 'progres', 'reglages'] as const) {
        expect(PHOTOS).not.toContain(enteteDe(id, e));
      }
    }
  });

  it('la tête de l’athlète reste entière : photo calée en haut', () => {
    expect(VISUELS.persoAujourdhui.focus).toMatch(/ 0%$/);
  });

  it('la photo tient la droite et se fond LARGEMENT : le fondu choisi par Guillaume', () => {
    // Deux versions lui ont été montrées ; il a gardé celle où le titre mord
    // sur la photo, « parce qu'on voit mieux le bandeau ».
    expect(lire('../components/ScreenHeader.module.css')).toMatch(
      /:global\(\[data-theme='perso'\]\) \.hero \.fond \{[^}]*\n  mask-image:\s*linear-gradient\(104deg, transparent 14%, rgb\(0 0 0 \/ 22%\) 34%, #000 58%\)/,
    );
    const entete = lire('../components/ScreenHeader.module.css');
    expect(entete).toMatch(
      /:global\(\[data-theme='perso'\]\) \.hero \.fond \{[^}]*inset: 0 0 0 auto;[^}]*mask-image:/,
    );
    // Le fondu brun de l'heure passe AU-DESSUS de la photo.
    expect(entete).toMatch(
      /:global\(\[data-theme='perso'\]\) \.hero \.voile \{[^}]*rgb\(107 85 72\) 0/,
    );
  });

  it('la Semaine ne prend pas la variante MASS (titre blanc) parce qu’elle a une photo', () => {
    expect(lire('../screens/WeekScreen.tsx').replace(/\s+/g, ' ')).toContain(
      "programmeParId(programme.id)?.familleId === 'mass' && enteteDe(programme.id, 'semaine') !== undefined",
    );
  });
});
