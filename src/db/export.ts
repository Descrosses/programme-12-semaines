/**
 * Export et import de la totalité des données.
 *
 * Défaut n°10 du prototype : si le téléphone casse, tout est perdu. Ici un
 * fichier JSON contient l'intégralité de l'historique, lisible et réimportable.
 */

import {
  db,
  type CombineRow,
  type ReadinessRow,
  type SessionRow,
  type SetRow,
  type SettingsRow,
} from './db';

/** Version du format, pour qu'un export d'aujourd'hui reste lisible plus tard. */
export const EXPORT_VERSION = 1;

export interface ExportFile {
  format: 'programme-12-semaines';
  version: number;
  exportedAt: string;
  settings: SettingsRow | null;
  sessions: SessionRow[];
  sets: SetRow[];
  readiness: ReadinessRow[];
  combines: CombineRow[];
}

export async function exportAll(): Promise<ExportFile> {
  const [settings, sessions, sets, readiness, combines] = await Promise.all([
    db.settings.get(1),
    db.sessions.toArray(),
    db.sets.toArray(),
    db.readiness.toArray(),
    db.combines.toArray(),
  ]);

  return {
    format: 'programme-12-semaines',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: settings ?? null,
    sessions,
    sets,
    readiness,
    combines,
  };
}

/** Nom de fichier daté, pour ne pas écraser un export précédent. */
export function exportFileName(now = new Date()): string {
  return `programme-12-semaines-${now.toISOString().slice(0, 10)}.json`;
}

/** Déclenche le téléchargement du fichier depuis le navigateur. */
export async function downloadExport(): Promise<void> {
  const data = await exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Laisse le temps au navigateur de démarrer le téléchargement.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export interface ImportReport {
  sessions: number;
  sets: number;
  readiness: number;
  combines: number;
  settings: boolean;
}

/** Vérifie qu'un fichier est bien un export de cette appli avant d'y toucher. */
export function parseExport(text: string): ExportFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Ce fichier n’est pas du JSON valide.');
  }
  const f = parsed as Partial<ExportFile>;
  if (f?.format !== 'programme-12-semaines') {
    throw new Error('Ce fichier ne vient pas de cette application.');
  }
  if (typeof f.version !== 'number' || f.version > EXPORT_VERSION) {
    throw new Error(
      `Ce fichier vient d’une version plus récente (${String(f.version)}). Mets l’application à jour.`,
    );
  }
  return {
    format: 'programme-12-semaines',
    version: f.version,
    exportedAt: f.exportedAt ?? '',
    settings: f.settings ?? null,
    sessions: f.sessions ?? [],
    sets: f.sets ?? [],
    readiness: f.readiness ?? [],
    combines: f.combines ?? [],
  };
}

/**
 * Remplace intégralement le contenu de la base par celui du fichier.
 *
 * Volontairement destructif et sans fusion : mélanger deux historiques
 * produirait des doublons de séries et fausserait les règles de progression.
 * L'écran d'import prévient avant d'appeler cette fonction.
 */
export async function importAll(file: ExportFile): Promise<ImportReport> {
  return db.transaction(
    'rw',
    [db.settings, db.sessions, db.sets, db.readiness, db.combines],
    async () => {
      await Promise.all([
        db.sessions.clear(),
        db.sets.clear(),
        db.readiness.clear(),
        db.combines.clear(),
      ]);
      if (file.settings) await db.settings.put({ ...file.settings, id: 1 });
      await db.sessions.bulkAdd(file.sessions);
      await db.sets.bulkAdd(file.sets);
      await db.readiness.bulkAdd(file.readiness);
      await db.combines.bulkAdd(file.combines);

      return {
        sessions: file.sessions.length,
        sets: file.sets.length,
        readiness: file.readiness.length,
        combines: file.combines.length,
        settings: file.settings !== null,
      };
    },
  );
}

/** Efface tout l'historique. Les réglages sont conservés. */
export async function resetHistory(): Promise<void> {
  await db.transaction('rw', [db.sessions, db.sets, db.readiness, db.combines], async () => {
    await Promise.all([
      db.sessions.clear(),
      db.sets.clear(),
      db.readiness.clear(),
      db.combines.clear(),
    ]);
  });
}
