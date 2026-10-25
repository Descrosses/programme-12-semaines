/**
 * Le schéma de la base TEL QU'IL ÉTAIT, version par version.
 *
 * Réservé aux tests de migration. Une migration ne se vérifie qu'en partant
 * d'une base construite au schéma d'avant : si on la construit avec le schéma
 * d'aujourd'hui, les nouvelles tables existent déjà et la montée de version ne
 * fait rien. Il faut donc une copie figée du passé, et c'est ce fichier.
 *
 * Il est volontairement recopié à la main et jamais dérivé de `db.ts` : son
 * intérêt est précisément de NE PAS suivre les corrections apportées depuis.
 * Le jour où quelqu'un le « factorise » avec `db.ts`, le test de migration
 * cesse de tester quoi que ce soit.
 */

/** Les `stores()` cumulés jusqu'à la v14 incluse, dans l'ordre des versions. */
export function v14Schema(): Array<[number, Record<string, string>]> {
  return [
    [
      1,
      {
        sessions: "++id, &[week+day], date, status",
        sets: "++id, sessionId, [sessionId+exerciseId], exerciseId, [exerciseId+week], date",
        readiness: "++id, date, [week+day], week",
        combines: "++id, &phase, date",
        settings: "id",
      },
    ],
    [2, {}],
    [3, { measurements: "++id, &date" }],
    [
      4,
      {
        progressPhotos: "++id, &week, date",
        exerciseMedia: "++id, exerciseId, [exerciseId+date], week, date",
        exerciseVideoLog: "++id, exerciseId, [exerciseId+date], week, date",
      },
    ],
    [5, {}],
    [6, {}],
    [7, { exerciseReference: "++id, &exerciseId" }],
    [8, { foodOverrides: "++id, &foodId" }],
    [
      9,
      {
        exerciseNotes:
          "++id, &[exerciseId+week+day], exerciseId, [exerciseId+week], date",
      },
    ],
    [10, { customFoods: "++id, &foodId, category, addedAt" }],
    [11, { mealLog: "++id, &[date+mealId], date" }],
    [12, { dayKind: "++id, &date" }],
    [13, { painLog: "++id, &[date+exId], date, exId" }],
    [14, { extraFoods: "++id, [date+mealId], date" }],
  ];
}

/** Efface une base jetable entre deux tests. */
export async function deleteDB(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onblocked = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
