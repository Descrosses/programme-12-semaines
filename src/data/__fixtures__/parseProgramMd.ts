/**
 * Lecteur du tableau §9 directement dans `programme-final-12-semaines.md`.
 *
 * Sert uniquement aux tests : plutôt que de comparer `mainLiftTable.ts` à une
 * recopie faite à la main (qui peut contenir la même faute de frappe deux
 * fois), on le compare au fichier source lui-même. Si le .md change, le test
 * casse — c'est exactement ce qu'on veut.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MD_PATH = fileURLToPath(new URL('../../../programme-final-12-semaines.md', import.meta.url));

export type ParsedCell =
  /** « — » : le mouvement n'est pas programmé cette semaine-là. */
  | { kind: 'absent'; raw: string }
  /** « TEST mer » : semaine de test, aucune charge planifiée. */
  | { kind: 'test'; raw: string }
  /** « 5×5×70 % – RPE 7 », « 5×3×50 », « 4×1-2×89 % + contraste ». */
  | {
      kind: 'load';
      raw: string;
      sets: number;
      reps: number | { min: number; max: number };
      /**
       * Le chiffre de la case — un POURCENTAGE quand `pct` est vrai, des
       * kilos sinon. Le §9 mêle les deux : les colonnes indexées sur un
       * maximum sont en pourcentages, Push Press reste en kilos absolus.
       */
      valeur: number;
      /** La case se lit « 70 % » et non « 70 kg ». */
      pct: boolean;
      /**
       * La case donne une FORME de progression, pas une charge : son kilo est
       * celui de l'auteur du programme et ne vaut que pour mesurer l'écart au
       * plan. Push Press et RDL, les deux colonnes que le programme ne
       * rattache à aucun maximum.
       */
      forme: boolean;
      /** Le « + » de « +17,5 » : charge ajoutée au poids du corps. */
      added: boolean;
      rpe: number | null;
      contrast: boolean;
      mentionsTest: boolean;
    };

export interface ParsedRow {
  week: number;
  cells: ParsedCell[];
}

export interface ParsedSection9 {
  headers: string[];
  rows: ParsedRow[];
}

/** « 97,5 » → 97.5 */
function num(s: string): number {
  return Number(s.replace(',', '.'));
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/** Les en-têtes des colonnes dont le kilo n'est qu'une forme. */
const COLONNES_FORME = ['Push Press (ven)'];

function parseCell(raw: string, forme = false): ParsedCell {
  if (raw === '—' || raw === '-' || raw === '') return { kind: 'absent', raw };

  // sets × reps × charge   (reps peut être « 1-2 », charge peut être « +17,5 »)
  const m = /^(\d+)\s*×\s*(\d+(?:-\d+)?)\s*×\s*(\+?)\s*([\d,]+)/.exec(raw);
  if (!m) {
    if (/TEST/i.test(raw)) return { kind: 'test', raw };
    throw new Error(`Cellule §9 non reconnue : « ${raw} »`);
  }

  const repsRaw = m[2]!;
  const dash = repsRaw.indexOf('-');
  const reps =
    dash === -1
      ? Number(repsRaw)
      : { min: Number(repsRaw.slice(0, dash)), max: Number(repsRaw.slice(dash + 1)) };

  const rpeMatch = /RPE\s*([\d,]+)/i.exec(raw);
  // « 70 % » : le signe suit immédiatement le nombre de la charge.
  const pct = new RegExp(`×\\s*${m[4]!.replace(',', '[,.]')}\\s*%`).test(raw);

  return {
    kind: 'load',
    raw,
    sets: Number(m[1]!),
    reps,
    valeur: num(m[4]!),
    pct,
    forme: forme && !pct,
    added: m[3] === '+',
    rpe: rpeMatch ? num(rpeMatch[1]!) : null,
    contrast: /contraste/i.test(raw),
    mentionsTest: /TEST/i.test(raw),
  };
}

/** Extrait et analyse le tableau de la section 9. */
export function parseSection9(markdown = readFileSync(MD_PATH, 'utf8')): ParsedSection9 {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s*9\./.test(l));
  if (start === -1) throw new Error('Section 9 introuvable dans le .md');

  const tableLines: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^##\s/.test(line)) break;
    if (line.trim().startsWith('|')) tableLines.push(line);
  }
  if (tableLines.length < 3) throw new Error('Tableau §9 introuvable ou vide');

  const headers = splitRow(tableLines[0]!);
  // tableLines[1] est la ligne de séparation « |---|---| »
  const rows = tableLines.slice(2).map<ParsedRow>((line) => {
    const cells = splitRow(line);
    return {
      week: Number(cells[0]),
      cells: cells
        .slice(1)
        .map((c, i) => parseCell(c, COLONNES_FORME.includes(headers[i + 1] ?? ''))),
    };
  });

  return { headers, rows };
}
