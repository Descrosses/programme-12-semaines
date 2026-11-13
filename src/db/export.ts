/**
 * Export et import de la totalité des données.
 *
 * Défaut n°10 du prototype : si le téléphone casse, tout est perdu. Ici un
 * fichier JSON contient l'intégralité de l'historique, lisible et réimportable.
 */

import { blobToDataUrl, dataUrlToBlob } from '../media/photo';
import { cyclePourEcriture } from './repo';
import {
  db,
  type CombineRow,
  type CycleRow,
  type CustomFoodRow,
  type DayKindRow,
  type FoodOverrideRow,
  type MealLogRow,
  type ExerciseVideoLogRow,
  type MeasurementRow,
  type ExerciseNoteRow,
  type ExtraFoodRow,
  type NoteDraftRow,
  type NoteRow,
  type PainLogRow,
  type FemmesSeanceRow,
  type SessionExerciseRow,
  type ReadinessRow,
  type SessionRow,
  type SetRow,
  type SettingsRow,
} from './db';

/** Version du format, pour qu'un export d'aujourd'hui reste lisible plus tard. */
export const EXPORT_VERSION = 3;

/*
 * Les tables que la sauvegarde couvre, nommées une fois.
 *
 * Elles ne servent pas à construire l'export — `exportAll` et `exportPhotos`
 * nomment leurs tables une par une, et c'est plus lisible ainsi. Elles servent
 * à le VÉRIFIER : `exportRoundTrip.test.ts` compare cette union à la liste
 * réelle des tables de la base, et échoue si l'une manque.
 *
 * C'est la seule protection qui tienne dans le temps. Deux trous ont déjà été
 * trouvés après coup — `exerciseNotes`, puis les quatre tables de nutrition
 * ci-dessous, qui n'ont jamais été sauvegardées depuis leur création. Un
 * commentaire n'empêche pas le troisième ; un test qui casse, si.
 */
export const TABLES_SAUVEGARDEES = [
  'cycles',
  'settings',
  'sessions',
  'sets',
  'readiness',
  'combines',
  'measurements',
  'exerciseVideoLog',
  'painLog',
  'femmesSeances',
  'extraFoods',
  'notes',
  'noteDrafts',
  'sessionExercises',
  'exerciseNotes',
  'mealLog',
  'dayKind',
  'foodOverrides',
  'customFoods',
] as const;

/** Les tables du second fichier, celui des images. */
export const TABLES_PHOTOS = ['progressPhotos', 'exerciseMedia', 'exerciseReference'] as const;

export interface ExportFile {
  format: 'programme-12-semaines';
  version: number;
  exportedAt: string;
  settings: SettingsRow | null;
  sessions: SessionRow[];
  sets: SetRow[];
  readiness: ReadinessRow[];
  combines: CombineRow[];
  /** Absent des exports antérieurs à l'onglet Nutrition : toujours optionnel. */
  measurements?: MeasurementRow[];
  /** Traces de vidéo — quelques octets chacune, elles restent ici. */
  videoLog?: ExerciseVideoLogRow[];
  /** Suivi de douleur (écran retiré, données conservées). Absent des exports antérieurs : toujours optionnel. */
  painLog?: PainLogRow[];
  /** Séances FEMMES (v23). Absent des exports antérieurs : toujours optionnel. */
  femmesSeances?: FemmesSeanceRow[];
  /** Aliments mangés en plus du plan. Absent des exports antérieurs. */
  extraFoods?: ExtraFoodRow[];
  /**
   * Remarques appendues (v15). Absent des exports antérieurs : toujours
   * optionnel, un fichier d'avant la v15 reste réimportable tel quel.
   */
  notes?: NoteRow[];
  /**
   * Brouillons de remarque en cours de frappe. Exportés aussi : une phrase
   * laissée dans le champ au moment de la sauvegarde est une saisie comme une
   * autre, et la perdre à la restauration serait exactement le défaut qu'on
   * cherche à fermer.
   */
  noteDrafts?: NoteDraftRow[];
  /** Exercices remplacés ou ajoutés en séance (v15). */
  sessionExercises?: SessionExerciseRow[];
  /**
   * Les remarques d'AVANT la v15, telles quelles.
   *
   * Elles ont été recopiées dans `notes` par la migration et ne sont plus
   * écrites par personne. Elles restent exportées pour une seule raison : un
   * export est la seule copie de secours de cette base, et une table qui n'y
   * figure pas disparaît au premier changement de téléphone. Celle-ci n'y
   * figurait pas — c'était un trou.
   */
  exerciseNotes?: ExerciseNoteRow[];
  /**
   * Les quatre tables de l'onglet Nutrition (v8 à v14).
   *
   * Elles manquaient à la sauvegarde depuis leur création : un changement de
   * téléphone, ou une restauration après panne, effaçait en silence tous les
   * repas cochés, les aliments remplacés, les aliments créés à la main et les
   * jours forcés en entraînement ou en repos. L'historique d'entraînement
   * revenait, l'historique alimentaire non.
   *
   * Optionnelles, comme les autres : un fichier exporté avant aujourd'hui
   * (version 1) n'a aucune de ces clés et reste réimportable tel quel.
   */
  mealLog?: MealLogRow[];
  dayKind?: DayKindRow[];
  foodOverrides?: FoodOverrideRow[];
  customFoods?: CustomFoodRow[];
  /**
   * Les cycles (v17), et avec eux la clé de lecture de tout le reste.
   *
   * Chaque ligne de séance, de série ou de remarque porte le `cycleId` du
   * cycle auquel elle appartient. Exporter les lignes sans les cycles rendrait
   * ces numéros muets : à la réimportation, plus moyen de savoir lequel des
   * deux POWER 12 on est en train de relire.
   *
   * Absent d'un fichier de version 1 ou 2, qui est d'avant les cycles.
   * L'import lui en fabrique alors un seul et y rattache tout — exactement ce
   * que fait la montée v17 sur une base existante.
   */
  cycles?: CycleRow[];
  /**
   * Toujours `false`. Les photos ont leur propre fichier : voir
   * `exportPhotos()` et le commentaire qui l'accompagne.
   */
  photosIncluded: false;
}

/**
 * Fichier de photos, séparé du fichier de données.
 *
 * Pourquoi deux fichiers plutôt qu'un :
 *
 * 1. Le base64 gonfle de 33 %. Douze semaines chargées en photos d'exercice
 *    peuvent peser 50 Mo en base, soit ~67 Mo de chaîne JSON. `JSON.stringify`
 *    sur une chaîne pareille fait tomber Safari sur iPhone bien avant la fin.
 * 2. La sauvegarde de sécurité doit rester légère pour être faite souvent.
 *    Un fichier de 60 Ko qu'on exporte chaque semaine protège l'historique
 *    d'entraînement, qui est irremplaçable ; un fichier de 67 Mo ne serait
 *    jamais exporté.
 *
 * Les photos partent donc à la demande, dans leur propre fichier, et l'import
 * reconnaît tout seul lequel des deux on lui donne.
 */
export interface PhotoExportFile {
  format: 'programme-12-semaines-photos';
  version: number;
  exportedAt: string;
  progressPhotos: Array<{
    week: number;
    date: string;
    dataUrl: string;
    width: number;
    height: number;
  }>;
  exerciseMedia: Array<{
    exerciseId: string;
    week: number;
    day: number;
    date: string;
    dataUrl: string;
    width: number;
    height: number;
  }>;
  /** Fiches techniques. Absentes des exports antérieurs : toujours optionnel. */
  exerciseReference?: Array<{
    exerciseId: string;
    addedAt: string;
    dataUrl: string;
    width: number;
    height: number;
  }>;
}

export async function exportAll(): Promise<ExportFile> {
  const [
    settings,
    sessions,
    sets,
    readiness,
    combines,
    measurements,
    videoLog,
    painLog,
    femmesSeances,
    extraFoods,
    notes,
    noteDrafts,
    sessionExercises,
    exerciseNotes,
    mealLog,
    dayKind,
    foodOverrides,
    customFoods,
    cycles,
  ] = await Promise.all([
    db.settings.get(1),
    db.sessions.toArray(),
    db.sets.toArray(),
    db.readiness.toArray(),
    db.combines.toArray(),
    db.measurements.toArray(),
    db.exerciseVideoLog.toArray(),
    db.painLog.toArray(),
    db.femmesSeances.toArray(),
    db.extraFoods.toArray(),
    db.notes.toArray(),
    db.noteDrafts.toArray(),
    db.sessionExercises.toArray(),
    db.exerciseNotes.toArray(),
    db.mealLog.toArray(),
    db.dayKind.toArray(),
    db.foodOverrides.toArray(),
    db.customFoods.toArray(),
    db.cycles.toArray(),
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
    measurements,
    videoLog,
    painLog,
    femmesSeances,
    extraFoods,
    notes,
    noteDrafts,
    sessionExercises,
    exerciseNotes,
    mealLog,
    dayKind,
    foodOverrides,
    customFoods,
    cycles,
    photosIncluded: false,
  };
}

/** Le fichier de photos, construit à la demande. */
export async function exportPhotos(): Promise<PhotoExportFile> {
  const [photos, media, references] = await Promise.all([
    db.progressPhotos.toArray(),
    db.exerciseMedia.toArray(),
    db.exerciseReference.toArray(),
  ]);
  return {
    format: 'programme-12-semaines-photos',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    progressPhotos: await Promise.all(
      photos.map(async (p) => ({
        week: p.week,
        date: p.date,
        width: p.width,
        height: p.height,
        dataUrl: await blobToDataUrl(p.blob),
      })),
    ),
    exerciseMedia: await Promise.all(
      media.map(async (m) => ({
        exerciseId: m.exerciseId,
        week: m.week,
        day: m.day,
        date: m.date,
        width: m.width,
        height: m.height,
        dataUrl: await blobToDataUrl(m.blob),
      })),
    ),
    exerciseReference: await Promise.all(
      references.map(async (r) => ({
        exerciseId: r.exerciseId,
        addedAt: r.addedAt,
        width: r.width,
        height: r.height,
        dataUrl: await blobToDataUrl(r.blob),
      })),
    ),
  };
}

/** Nom de fichier daté, pour ne pas écraser un export précédent. */
export function exportFileName(now = new Date()): string {
  return `programme-12-semaines-${now.toISOString().slice(0, 10)}.json`;
}

function download(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Laisse le temps au navigateur de démarrer le téléchargement.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Déclenche le téléchargement du fichier de données depuis le navigateur. */
export async function downloadExport(): Promise<void> {
  download(JSON.stringify(await exportAll(), null, 2), exportFileName());
}

/**
 * Téléchargement du fichier de photos.
 *
 * Sans indentation, contrairement au fichier de données : sur des dizaines de
 * chaînes base64, les espaces ajoutent des mégaoctets pour une lisibilité dont
 * personne n'a l'usage. Rend la taille produite, pour l'annoncer.
 */
export async function downloadPhotoExport(): Promise<{
  bytes: number;
  count: number;
}> {
  const file = await exportPhotos();
  const json = JSON.stringify(file);
  download(json, `programme-12-semaines-photos-${new Date().toISOString().slice(0, 10)}.json`);
  return {
    bytes: new Blob([json]).size,
    count: file.progressPhotos.length + file.exerciseMedia.length,
  };
}

export interface ImportReport {
  sessions: number;
  sets: number;
  readiness: number;
  combines: number;
  measurements: number;
  videoLog: number;
  painLog: number;
  femmesSeances: number;
  extraFoods: number;
  notes: number;
  noteDrafts: number;
  sessionExercises: number;
  exerciseNotes: number;
  mealLog: number;
  dayKind: number;
  foodOverrides: number;
  customFoods: number;
  cycles: number;
  settings: boolean;
}

export interface PhotoImportReport {
  progressPhotos: number;
  exerciseMedia: number;
  exerciseReference: number;
}

/** Ce que contient un fichier déposé — l'import s'adapte au lieu d'exiger. */
export type AnyExportFile =
  | { kind: 'données'; file: ExportFile }
  | { kind: 'photos'; file: PhotoExportFile };

/**
 * Reconnaît lequel des deux fichiers on vient de recevoir.
 *
 * Guillaume n'a pas à se souvenir du bouton qu'il avait utilisé : il dépose le
 * fichier, l'appli voit ce que c'est.
 */
export function parseAnyExport(text: string): AnyExportFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Ce fichier n’est pas du JSON valide.');
  }
  if ((parsed as { format?: string })?.format === 'programme-12-semaines-photos') {
    const f = parsed as PhotoExportFile;
    return {
      kind: 'photos',
      file: {
        format: 'programme-12-semaines-photos',
        version: f.version ?? EXPORT_VERSION,
        exportedAt: f.exportedAt ?? '',
        progressPhotos: f.progressPhotos ?? [],
        exerciseMedia: f.exerciseMedia ?? [],
        exerciseReference: f.exerciseReference ?? [],
      },
    };
  }
  return { kind: 'données', file: parseExport(text) };
}

/** Remplace les photos par celles du fichier. Ne touche à aucune autre table. */
export async function importPhotos(file: PhotoExportFile): Promise<PhotoImportReport> {
  const progress = await Promise.all(
    file.progressPhotos.map(async (p) => {
      const blob = await dataUrlToBlob(p.dataUrl);
      return {
        cycleId: cyclePhotos,
        week: p.week,
        date: p.date,
        width: p.width,
        height: p.height,
        blob,
        bytes: blob.size,
      };
    }),
  );
  const media = await Promise.all(
    file.exerciseMedia.map(async (m) => {
      const blob = await dataUrlToBlob(m.dataUrl);
      return {
        cycleId: cyclePhotos,
        exerciseId: m.exerciseId,
        week: m.week,
        day: m.day as 0 | 1 | 2 | 3 | 4,
        date: m.date,
        width: m.width,
        height: m.height,
        blob,
        bytes: blob.size,
      };
    }),
  );

  const cyclePhotos = (await cyclePourEcriture()).id as number;

  const references = await Promise.all(
    (file.exerciseReference ?? []).map(async (r) => {
      const blob = await dataUrlToBlob(r.dataUrl);
      return {
        exerciseId: r.exerciseId,
        addedAt: r.addedAt,
        width: r.width,
        height: r.height,
        blob,
        bytes: blob.size,
      };
    }),
  );

  await db.transaction(
    'rw',
    [db.progressPhotos, db.exerciseMedia, db.exerciseReference],
    async () => {
      await Promise.all([
        db.progressPhotos.clear(),
        db.exerciseMedia.clear(),
        db.exerciseReference.clear(),
      ]);
      await db.progressPhotos.bulkAdd(progress);
      await db.exerciseMedia.bulkAdd(media);
      await db.exerciseReference.bulkAdd(references);
    },
  );

  return {
    progressPhotos: progress.length,
    exerciseMedia: media.length,
    exerciseReference: references.length,
  };
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
    // Un export d'avant l'onglet Nutrition n'a pas ce tableau : liste vide, pas
    // une erreur — il reste parfaitement réimportable.
    measurements: f.measurements ?? [],
    videoLog: f.videoLog ?? [],
    painLog: f.painLog ?? [],
    femmesSeances: f.femmesSeances ?? [],
    extraFoods: f.extraFoods ?? [],
    notes: f.notes ?? [],
    noteDrafts: f.noteDrafts ?? [],
    sessionExercises: f.sessionExercises ?? [],
    exerciseNotes: f.exerciseNotes ?? [],
    mealLog: f.mealLog ?? [],
    dayKind: f.dayKind ?? [],
    foodOverrides: f.foodOverrides ?? [],
    customFoods: f.customFoods ?? [],
    cycles: f.cycles ?? [],
    photosIncluded: false,
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
  /*
   * Le cycle de destination, résolu AVANT la transaction — la portée
   * ci-dessous ne contient pas `cycles` pour les lectures, et Dexie refuse de
   * lire une table non déclarée.
   *
   * Deux cas, et un seul demande du travail :
   *
   * - Le fichier vient de la version 3 : il porte ses cycles et ses lignes
   *   savent déjà à qui elles appartiennent. On les remet tels quels, numéros
   *   d'origine compris, sinon les `cycleId` des lignes ne désigneraient plus
   *   rien.
   * - Le fichier est plus ancien : il n'a pas de cycle, et ses lignes non
   *   plus. On en crée un et on y rattache tout, exactement comme la montée
   *   v17 le fait sur une base existante.
   */
  const cyclesDuFichier = file.cycles ?? [];
  const cycleDeSecours = cyclesDuFichier.length === 0 ? await cyclePourEcriture() : null;
  const idSecours = cycleDeSecours?.id ?? 1;
  const rattacher = <T extends { cycleId?: number }>(lignes: T[]): T[] =>
    cyclesDuFichier.length > 0 ? lignes : lignes.map((l) => ({ ...l, cycleId: idSecours }));

  return db.transaction(
    'rw',
    [
      db.settings,
      db.sessions,
      db.sets,
      db.readiness,
      db.combines,
      db.measurements,
      db.exerciseVideoLog,
      db.painLog,
      db.femmesSeances,
      db.extraFoods,
      db.notes,
      db.noteDrafts,
      db.sessionExercises,
      db.exerciseNotes,
      db.mealLog,
      db.dayKind,
      db.foodOverrides,
      db.customFoods,
      db.cycles,
    ],
    async () => {
      const measurements = file.measurements ?? [];
      const videoLog = file.videoLog ?? [];
      const painLog = file.painLog ?? [];
      const femmesSeances = file.femmesSeances ?? [];
      const extraFoods = file.extraFoods ?? [];
      const notes = file.notes ?? [];
      const noteDrafts = file.noteDrafts ?? [];
      const sessionExercises = file.sessionExercises ?? [];
      const exerciseNotes = file.exerciseNotes ?? [];
      const mealLog = file.mealLog ?? [];
      const dayKind = file.dayKind ?? [];
      const foodOverrides = file.foodOverrides ?? [];
      const customFoods = file.customFoods ?? [];
      await Promise.all([
        db.cycles.clear(),
        db.sessions.clear(),
        db.sets.clear(),
        db.readiness.clear(),
        db.combines.clear(),
        db.measurements.clear(),
        db.exerciseVideoLog.clear(),
        db.painLog.clear(),
        db.femmesSeances.clear(),
        db.extraFoods.clear(),
        db.notes.clear(),
        db.noteDrafts.clear(),
        db.sessionExercises.clear(),
        db.exerciseNotes.clear(),
        db.mealLog.clear(),
        db.dayKind.clear(),
        db.foodOverrides.clear(),
        db.customFoods.clear(),
      ]);
      if (file.settings) await db.settings.put({ ...file.settings, id: 1 });

      /*
       * Les cycles d'abord, et AVEC leurs identifiants : un `cycleId` de 2 sur
       * une série ne veut dire quelque chose que si le cycle 2 existe sous ce
       * numéro-là. Une base vidée réattribuerait sinon 1, 2, 3 dans l'ordre
       * d'insertion, et les lignes se retrouveraient rattachées au mauvais
       * cycle sans que rien ne le signale.
       */
      if (cyclesDuFichier.length > 0) await db.cycles.bulkAdd(cyclesDuFichier);
      else if (cycleDeSecours) await db.cycles.add(cycleDeSecours);

      await db.sessions.bulkAdd(rattacher(file.sessions));
      await db.sets.bulkAdd(rattacher(file.sets));
      await db.readiness.bulkAdd(rattacher(file.readiness));
      await db.combines.bulkAdd(rattacher(file.combines));
      await db.measurements.bulkAdd(measurements);
      await db.exerciseVideoLog.bulkAdd(rattacher(videoLog));
      await db.painLog.bulkAdd(painLog);
      // Toujours rattachées à leur cycle : elles n'existent que dans des
      // fichiers qui portent aussi leurs cycles.
      await db.femmesSeances.bulkAdd(femmesSeances);
      await db.extraFoods.bulkAdd(extraFoods);
      await db.notes.bulkAdd(rattacher(notes));
      await db.noteDrafts.bulkAdd(rattacher(noteDrafts));
      await db.sessionExercises.bulkAdd(rattacher(sessionExercises));
      await db.exerciseNotes.bulkAdd(rattacher(exerciseNotes));
      await db.mealLog.bulkAdd(mealLog);
      await db.dayKind.bulkAdd(dayKind);
      await db.foodOverrides.bulkAdd(foodOverrides);
      await db.customFoods.bulkAdd(customFoods);

      return {
        sessions: file.sessions.length,
        sets: file.sets.length,
        readiness: file.readiness.length,
        combines: file.combines.length,
        measurements: measurements.length,
        videoLog: videoLog.length,
        painLog: painLog.length,
        femmesSeances: femmesSeances.length,
        extraFoods: extraFoods.length,
        notes: notes.length,
        noteDrafts: noteDrafts.length,
        sessionExercises: sessionExercises.length,
        exerciseNotes: exerciseNotes.length,
        mealLog: mealLog.length,
        dayKind: dayKind.length,
        foodOverrides: foodOverrides.length,
        customFoods: customFoods.length,
        cycles: cyclesDuFichier.length > 0 ? cyclesDuFichier.length : 1,
        settings: file.settings !== null,
      };
    },
  );
}

/*
 * `resetHistory` a été RETIRÉE, et pas seulement débranchée de l'écran.
 *
 * Elle vidait les douze tables d'un coup, sans filtre de cycle : lancée pour
 * nettoyer MASS, elle a emporté l'historique POWER avec lui, et les pesées,
 * et les repas. Une fonction qui ne sait pas distinguer deux programmes n'a
 * pas sa place dans une appli qui en fait tourner plusieurs.
 *
 * Pour retirer un programme, « Mon parcours » supprime UN cycle, et refuse
 * dès qu'il porte la moindre ligne. Pour repartir de zéro volontairement,
 * l'export puis la réinstallation restent le chemin — explicite, et avec une
 * sauvegarde en main.
 */

/**
 * Efface uniquement les photos.
 *
 * Séparé de la remise à zéro de l'historique : ce sont les photos qui pèsent,
 * et il faut pouvoir récupérer de la place sans perdre douze semaines de
 * séries. L'inverse vaut aussi — repartir à zéro sans jeter les photos.
 */
export async function resetPhotos(): Promise<void> {
  await db.transaction(
    'rw',
    [db.progressPhotos, db.exerciseMedia, db.exerciseReference],
    async () => {
      await Promise.all([
        db.progressPhotos.clear(),
        db.exerciseMedia.clear(),
        db.exerciseReference.clear(),
      ]);
    },
  );
}
