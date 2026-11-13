import { useEffect, useState, useMemo } from 'react';
import { LineChart, type Series } from '../components/Chart';
import { Stepper, stepValue } from '../components/Stepper';
import {
  HYDRATION_NOTE,
  NUTRITION_TARGETS,
  SHOPPING_LIST,
  SIMPLE_RULES,
  SUPPLEMENTS_NOTE,
  TARGET_GAIN_KG_PER_WEEK,
  type DayKind,
} from '../data/nutrition';
import type { DayIndex, WeekIndex } from '../data/types';
import { humanDate } from '../engine/calendar';
import { fr } from '../engine/format';
import { FOOD_LIBRARY, type LibraryFood } from '../data/foodLibrary';
import { AddFoodSheet } from '../components/AddFoodSheet';
import type { ExtraFoodRow } from '../db/db';
import type { Macros } from '../engine/nutrition';
import { DELOAD_BANNER, MEALS_GAP_TOLERANCE_PCT } from '../data/nutrition';
import {
  consumedTotal,
  extraMacros,
  fuelForDay,
  gapVerdict,
  mealMacros,
  mealsGap,
  mealsTotal,
  phaseForDay,
  remainingTotal,
  targetForPhase,
  type FoodOverrides,
  starchToCloseGap,
  latestWaist,
  nutritionAdvice,
  weeklyAverages,
  weightTrend,
  type Measurement,
  extrasTotal,
} from '../engine/nutrition';
import {
  allCustomFoods,
  allFoodOverrides,
  clearMealsEatenOn,
  mealsEatenOn,
  extrasOn,
  addExtra,
  removeExtra,
  saveCustomFood,
  setDayKindOverride,
  setMealEaten,
  allMeasurements,
  getMeasurement,
  resetFoodOverrides,
  saveFoodOverride,
  saveMeasurement,
  getSettingsRow,
  saveSettings,
} from '../db/repo';
import { MealItems } from '../components/MealItems';
import { cibleDuJour } from '../engine/cibleDuJour';
/*
 * Le « repas » auquel s'accrochent les aliments notés sans menu.
 *
 * `ExtraFoodRow.mealId` est une chaîne libre : lui donner une valeur à part
 * plutôt que de la laisser vide garde les lignes reconnaissables, et permet
 * de les distinguer un jour des ajouts faits à un vrai repas.
 */
const MEAL_LIBRE = 'libre';
import { macrosValides, type CiblesNutrition } from '../data/ciblesNutrition';
import { PLAN_PERSO_VIDE, copierJournee, journeeVide, type PlanPerso } from '../data/planPerso';
import { PlanPerso as PlanPersoSection } from '../components/PlanPerso';
import { MacroBar } from '../components/MacroBar';
import { MacroProgress } from '../components/MacroProgress';
import { shareOfDay } from '../engine/macroBar';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import styles from './Screens.module.css';

/**
 * Onglet Nutrition.
 *
 * Trois choses, dans cet ordre : ce que je dois manger aujourd'hui, ce que le
 * suivi me dit d'ajuster, et le détail qu'on ne relit qu'en faisant les courses.
 *
 * Ce n'est volontairement PAS un journal alimentaire. Pas de saisie repas par
 * repas, pas de base d'aliments : des applications gratuites font ça mieux, et
 * remplir un journal trois fois par jour ne tient pas un trimestre avec un
 * métier et deux enfants. La seule saisie ici est la pesée du matin, qui prend
 * cinq secondes et qui est la seule donnée qui pilote réellement le plan.
 */
/** Somme de deux jeux de macros, champ par champ. */
function additionner(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
  };
}

export function NutritionScreen({
  todayKind,
  kindProgramme,
  todayDay,
  todayWeek,
  onDayKindChange,
}: {
  /** Le palier RETENU pour aujourd'hui — un choix de Guillaume s'il en a fait un. */
  todayKind: DayKind;
  /** Ce que le programme prévoyait, avant tout détournement. */
  kindProgramme: DayKind;
  /** Jour de programme de la séance du jour, `null` si repos. */
  todayDay: DayIndex | null;
  /** Semaine de programme du jour, `null` hors programme. */
  todayWeek: WeekIndex | null;
  /** Prévient l'appli que la journée a changé de palier. */
  onDayKindChange: () => void;
}) {
  const [rows, setRows] = useState<Measurement[] | null>(null);
  const [legacyPlan, setLegacyPlan] = useState<boolean | null>(null);
  const [cibles, setCibles] = useState<CiblesNutrition | null>(null);
  const [plan, setPlan] = useState<PlanPerso | null>(null);
  const [preferes, setPreferes] = useState<readonly string[]>([]);
  const [overrides, setOverrides] = useState<FoodOverrides>({});
  /** Les aliments saisis par Guillaume, proposés au remplacement. */
  const [customs, setCustoms] = useState<LibraryFood[]>([]);
  /** Les repas cochés comme pris aujourd'hui, par identifiant. */
  const [pris, setPris] = useState<ReadonlySet<string>>(new Set());
  /** Les aliments mangés en plus du plan, aujourd'hui. */
  const [extras, setExtras] = useState<ExtraFoodRow[]>([]);
  /** Le repas dont la feuille d'ajout est ouverte, ou `null`. */
  const [ajoutPour, setAjoutPour] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [kind, setKind] = useState<DayKind>(todayKind);
  const [todayRow, setTodayRow] = useState<{
    weightKg: number | null;
    waistCm: number | null;
  }>({
    weightKg: null,
    waistCm: null,
  });

  const todayIso = new Date().toISOString().slice(0, 10);

  async function reload() {
    const settings = await getSettingsRow();
    setLegacyPlan(settings.legacyNutritionPlan);
    setCibles(settings.ciblesNutrition);
    setPlan(settings.planPerso);
    setPreferes(settings.alimentsPreferes ?? []);
    const all = await allMeasurements();
    setRows(
      all.map((r) => ({
        date: r.date,
        weightKg: r.weightKg,
        waistCm: r.waistCm,
      })),
    );
    setOverrides(await allFoodOverrides());
    setCustoms(await chargerCustoms());
    setPris(await mealsEatenOn(todayIso));
    setExtras(await extrasOn(todayIso));
    const t = await getMeasurement(todayIso);
    setTodayRow({ weightKg: t?.weightKg ?? null, waistCm: t?.waistCm ?? null });
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Le catalogue consulté par TOUS les calculs de l'écran : la bibliothèque
   * livrée, plus les aliments de Guillaume. Sans ce passage, un repas où il a
   * mis un aliment personnalisé retomberait sur celui du plan au moment du
   * total, et l'écran afficherait deux chiffres contradictoires.
   *
   * Déclaré AVANT le retour de chargement : un hook placé après un `return`
   * n'est pas appelé à tous les rendus, et React s'arrête net (erreur 310).
   */
  const catalogue = useMemo(
    () => ({
      ...FOOD_LIBRARY,
      ...Object.fromEntries(customs.map((f) => [f.id, f])),
    }),
    [customs],
  );

  if (!rows || legacyPlan === null) return <div className={styles.loading}>Chargement…</div>;

  /*
   * SANS MENUS — et ce n'est plus un écran vide.
   *
   * Les menus sont du contenu de coach : neuf prises nommées, avec leurs
   * horaires et leurs aliments. Personne ne peut les inventer à la place de
   * la personne, et les lui prêter reviendrait à lui prescrire la diète de
   * quelqu'un d'autre. Ils restent donc absents.
   *
   * Les CIBLES, elles, sont quatre nombres par journée. Posées dans les
   * Réglages, elles suffisent à tout ce qui compte au quotidien : la cible du
   * jour, la composition visée, ce qui a été mangé, et l'écart entre les deux.
   */
  if (!legacyPlan) {
    const resolue = cibleDuJour(kind, { menus: false, cibles });
    const mange = extrasTotal(extras);
    const cibleJour = resolue?.cible ?? null;
    const reste =
      cibleJour === null
        ? null
        : {
            kcal: Math.round(cibleJour.kcal - mange.kcal),
            proteinG: Math.round(cibleJour.proteinG - mange.proteinG),
            carbsG: Math.round(cibleJour.carbsG - mange.carbsG),
            fatG: Math.round(cibleJour.fatG - mange.fatG),
          };
    /*
     * `null` en base veut dire « rien de composé ». On travaille sur un plan
     * vide, mais on ne l'ÉCRIT pas : poser `{train:{},rest:{}}` en base ferait
     * passer une installation neuve pour une installation qui a commencé.
     */
    const planCourant = plan ?? PLAN_PERSO_VIDE;
    const journeeCourante = planCourant[kind];

    async function enregistrePlan(suivant: PlanPerso) {
      setPlan(suivant);
      await saveSettings({ planPerso: suivant });
    }

    return (
      <div className={styles.screen}>
        <ScreenHeader
          eyebrow="Suivi personnel"
          title="Nutrition"
          subtitle={cibleJour === null ? 'Tes cibles restent à poser' : cibleJour.label}
          visuel="ballon"
        />

        {cibleJour === null ? (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Aucune cible posée</h2>
            <p className={styles.cardSub}>
              MAJK ne décide pas combien tu dois manger. Pose tes calories et tes macros dans
              Réglages → Mes cibles nutritionnelles, et cet écran affichera ta cible du jour, ce que
              tu as mangé et l’écart entre les deux.
            </p>
            <p className={styles.fieldHint}>
              Tu peux déjà noter ce que tu manges et te peser ci-dessous : rien n’attend les cibles.
            </p>
          </section>
        ) : (
          <section className={styles.card}>
            <div className={styles.keyStat}>
              <div className={styles.keyStatLabel}>Ta cible aujourd’hui · {cibleJour.label}</div>
              <div className={`${styles.keyStatValue} tnum`}>
                {cibleJour.kcal.toLocaleString('fr-FR')} <span>kcal</span>
              </div>
            </div>
            <MacroBar
              macros={{
                kcal: cibleJour.kcal,
                proteinG: cibleJour.proteinG,
                carbsG: cibleJour.carbsG,
                fatG: cibleJour.fatG,
              }}
            />
          </section>
        )}

        {/*
          Le même sélecteur que dans le chemin avec menus, et pour la même
          raison : une séance faite un jour que le programme donne en repos se
          mange comme une séance. Il s'affiche même sans cible posée — déclarer
          sa journée ne dépend pas d'avoir des chiffres.
        */}
        <div className={styles.segment} role="group" aria-label="Palier alimentaire">
          {(['train', 'rest'] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={`${styles.segmentButton} ${kind === k ? styles.segmentOn : ''}`}
              onClick={() =>
                void (async () => {
                  setKind(k);
                  await setDayKindOverride(todayIso, k === todayKind ? null : k);
                  onDayKindChange();
                })()
              }
              aria-pressed={kind === k}
            >
              {k === 'train' ? 'Jour d’entraînement' : 'Jour de repos'}
            </button>
          ))}
        </div>

        {/*
          MON PLAN — cinq repas composés par la personne elle-même.
          Il vient APRÈS la cible et le sélecteur de journée, et avant le
          journal : on compose son plan, puis on note ce qu'on a vraiment
          mangé. L'ordre de l'écran suit l'ordre des gestes.
        */}
        <PlanPersoSection
          kind={kind}
          journee={journeeCourante}
          preferes={preferes}
          catalogue={catalogue}
          customs={customs}
          onCreateCustom={(food) =>
            void (async () => {
              await saveCustomFood({
                foodId: food.id,
                label: food.label,
                unit: food.unit,
                per: food.per,
                kcal: food.kcal,
                proteinG: food.proteinG,
                carbsG: food.carbsG,
                fatG: food.fatG,
                referenceState: food.referenceState,
                category: food.category,
                addedAt: new Date().toISOString().slice(0, 10),
              });
              setCustoms(await chargerCustoms());
            })()
          }
          cible={
            cibleJour === null
              ? null
              : {
                  kcal: cibleJour.kcal,
                  proteinG: cibleJour.proteinG,
                  carbsG: cibleJour.carbsG,
                  fatG: cibleJour.fatG,
                }
          }
          onChange={(suivante) => void enregistrePlan({ ...planCourant, [kind]: suivante })}
          onCopier={
            journeeVide(planCourant[kind === 'train' ? 'rest' : 'train'])
              ? null
              : () =>
                  void enregistrePlan(
                    copierJournee(planCourant, kind === 'train' ? 'rest' : 'train', kind),
                  )
          }
        />

        {/*
          Ce qui a été mangé, et ce qu'il reste.
          Une seule liste, sans repas : il n'y en a pas à remplir.
        */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Ce que j’ai mangé</h2>
          {extras.length === 0 ? (
            <p className={styles.cardSub}>Rien de noté aujourd’hui.</p>
          ) : (
            <>
              <div className={styles.keyStat}>
                <div className={styles.keyStatLabel}>Total du jour</div>
                <div className={`${styles.keyStatValue} tnum`}>
                  {Math.round(mange.kcal).toLocaleString('fr-FR')} <span>kcal</span>
                </div>
              </div>
              <MacroBar macros={mange} />
              <ExtrasDuRepas
                extras={extras}
                onRemove={async (id: number) => {
                  await removeExtra(id);
                  setExtras(await extrasOn(todayIso));
                }}
              />
            </>
          )}
          {reste !== null && (
            <p className={styles.fieldHint}>
              {reste.kcal > 0
                ? `Il reste ${reste.kcal.toLocaleString('fr-FR')} kcal, ${String(reste.proteinG)} g de protéines, ${String(reste.carbsG)} g de glucides et ${String(reste.fatG)} g de lipides pour atteindre ta cible.`
                : `Tu dépasses ta cible de ${Math.abs(reste.kcal).toLocaleString('fr-FR')} kcal.`}
            </p>
          )}
          <button
            type="button"
            className={styles.secondary}
            style={{ width: '100%', margin: '12px 0 0' }}
            onClick={() => setAjoutPour({ id: MEAL_LIBRE, name: 'Ce que j’ai mangé' })}
          >
            + Ajouter un aliment
          </button>
        </section>

        {ajoutPour && (
          <AddFoodSheet
            mealName={ajoutPour.name}
            customs={customs}
            preferes={preferes}
            onAdd={(food, qty) =>
              void (async () => {
                await addExtra(todayIso, MEAL_LIBRE, qty, food);
                setExtras(await extrasOn(todayIso));
              })()
            }
            onCreateCustom={(food) =>
              void (async () => {
                await saveCustomFood({
                  foodId: food.id,
                  label: food.label,
                  unit: food.unit,
                  per: food.per,
                  kcal: food.kcal,
                  proteinG: food.proteinG,
                  carbsG: food.carbsG,
                  fatG: food.fatG,
                  referenceState: food.referenceState,
                  category: food.category,
                  addedAt: new Date().toISOString().slice(0, 10),
                });
                setCustoms(await chargerCustoms());
              })()
            }
            onClose={() => setAjoutPour(null)}
          />
        )}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Pesée du matin</h2>
          <div className={styles.field}>
            <Stepper
              label={`Poids — ${humanDate(todayIso)}`}
              value={todayRow.weightKg}
              step={0.1}
              min={40}
              max={160}
              unit="kg"
              tone="accent"
              onStep={(d) =>
                void patchToday({ weightKg: stepValue(todayRow.weightKg, d, 40, 160) })
              }
              onCommit={(v) => void patchToday({ weightKg: v })}
            />
          </div>
          <div className={styles.field}>
            <Stepper
              label="Tour de taille"
              value={todayRow.waistCm}
              step={0.5}
              min={60}
              max={150}
              unit="cm"
              tone="accent"
              onStep={(d) => void patchToday({ waistCm: stepValue(todayRow.waistCm, d, 60, 150) })}
              onCommit={(v) => void patchToday({ waistCm: v })}
            />
          </div>
        </section>
      </div>
    );
  }

  /*
   * La phase de la journée — ce que la périodisation change dans l'assiette.
   *
   * Elle s'applique aux DEUX paliers : en semaine de deload, le jour de repos
   * baisse aussi, simplement deux fois moins. Chaque palier porte ses propres
   * quantités allégées, donc le même appel suffit pour les deux.
   */
  const phase = phaseForDay(todayWeek, todayDay);
  const target = targetForPhase(NUTRITION_TARGETS[kind], phase);
  const totalRepas = mealsTotal(target, overrides, catalogue);
  /* Le plan et ce qu'on y a ajouté aujourd'hui : c'est ce total-là que la
     liste des repas affiche. La cible, elle, reste celle du plan. */
  const ajoutsDuJour = extrasTotal(extras);
  const totalAvecAjouts = additionner(totalRepas, ajoutsDuJour);
  const ecart = mealsGap(target, overrides, catalogue);
  const verdict = gapVerdict(target, overrides, MEALS_GAP_TOLERANCE_PCT, catalogue);
  /*
   * Ce qui a été pris, et ce qu'il reste. Calculés sur le palier CONSULTÉ, et
   * la carte ne s'affiche que lorsqu'il est celui du jour : comparer ce qu'on a
   * mangé à la journée type de l'autre palier ne voudrait rien dire.
   */
  const consomme = consumedTotal(target, pris, overrides, catalogue, extras);
  /*
   * La référence est le plan PRESCRIT, sans les corrections de Guillaume.
   *
   * Avec elles, la cible monterait en même temps que l'assiette : peser 900 g
   * de riz au lieu de 250 ferait monter le « prévu » d'autant, et la barre
   * afficherait 100 % quoi qu'il arrive. Un dépassement ne se verrait jamais.
   *
   * La phase, elle, EST dans la référence : une semaine de deload prescrit
   * moins, et c'est à ce moins-là qu'on se compare.
   */
  const prevu = mealsTotal(target);
  /*
   * On compte les repas DE CE PALIER, pas toutes les coches de la journée.
   *
   * Une coche posée sur le palier d'entraînement reste en base quand on revient
   * au repos — elle dit ce qui a été pris, et c'est bien. Mais la compter dans
   * « 2 repas sur 5 » d'un palier où ce repas n'existe pas affichait un total
   * qui ne correspondait à aucune des cinq lignes affichées.
   */
  const prisIci = target.meals.filter((m) => pris.has(m.id)).length;
  const restant = remainingTotal(prevu, consomme);
  /*
   * Le carburant parle du JOUR, pas du palier consulté : basculer le sélecteur
   * pour regarder l'autre journée type ne doit pas faire croire que la séance
   * a changé. La carte reste donc sur aujourd'hui.
   */
  const carburant = fuelForDay(todayDay, kind);
  const baseAujourdhui = mealsTotal(
    targetForPhase(NUTRITION_TARGETS[todayKind], phase),
    overrides,
    catalogue,
  );
  const trend = weightTrend(rows, todayIso);
  const advice = nutritionAdvice(rows, todayIso);
  const waist = latestWaist(rows);

  // 8 fenêtres : la courbe montre presque deux mois, assez pour lire une pente.
  const points = weeklyAverages(rows, todayIso, 8)
    .filter((p) => p.average !== null)
    .reverse();
  const series: Series[] = [
    {
      label: 'Moyenne 7 jours',
      color: 'var(--accent)',
      points: points.map((p, i) => ({ x: i, y: p.average! })),
    },
  ];
  // « 14/8 » plutôt que « 14 » : sur deux mois de courbe, le seul numéro de
  // jour redevient ambigu dès qu'on repasse par un 1er.
  const xLabels = Object.fromEntries(
    points.map((p, i) => {
      const [, month, day] = p.endDate.split('-');
      return [i, `${Number(day)}/${Number(month)}`];
    }),
  );

  async function patchToday(patch: { weightKg?: number | null; waistCm?: number | null }) {
    await saveMeasurement(todayIso, patch);
    await reload();
  }

  /*
   * Les cibles saisies, quand elles existent ET que le plan les couvre.
   *
   * `cibleDuJour` tranche en faveur des menus — c'est la bonne règle, leurs
   * repas sont affichés juste en dessous et leur somme est ce qui sera
   * mangé. Mais quelqu'un qui vient de poser 2 800 kcal dans les Réglages et
   * qui lit 3 226 ici croit que son geste n'a servi à rien. On lui dit.
   */
  const ciblesEnAttente = macrosValides(cibles?.[kind]) ? cibles![kind] : null;

  return (
    <div className={styles.screen}>
      <ScreenHeader
        eyebrow="Cinq prises par jour"
        title="Nutrition"
        subtitle="Glucides hauts, protéines suffisantes"
        visuel="ballon"
      >
        <p className={styles.lead}>
          Les mêmes aliments tous les jours — seuls les féculents baissent les jours de repos.
          Touche un aliment pour corriger son étiquette ou le remplacer.
        </p>
      </ScreenHeader>

      {/*
        Bandeau de deload — discret, et seulement quand il a quelque chose à
        dire. Il explique un chiffre qui a bougé tout seul : sans lui, les
        portions allégées ressembleraient à un bug.
      */}
      {phase === 'deloadLight' && (
        <div className={styles.phaseNote}>
          <b>{DELOAD_BANNER.title}</b>
          <span>{DELOAD_BANNER.text}</span>
        </div>
      )}

      {/* --- 1. Référence du jour ------------------------------------------ */}
      <section className={styles.card}>
        {/*
          Les quatre nombres de cette carte sont la SOMME DES REPAS, pas la
          cible écrite à côté. Tant que rien n'est modifié, les deux coïncident
          — c'est le cas aujourd'hui, au kcal près. Mais si Guillaume recopie
          une étiquette, c'est son total réel qui doit s'afficher en grand, pas
          une intention qui ne correspondrait plus à ce qu'il mange.
        */}
        <div className={styles.keyStat}>
          <div className={styles.keyStatValue}>
            {totalRepas.kcal.toLocaleString('fr-FR')}
            <span className={styles.keyStatUnit}> kcal / jour</span>
          </div>
          <div className={styles.keyStatLabel}>Ta cible aujourd’hui · {target.label}</div>
        </div>
        {/* Même ordre que la barre juste en dessous — glucides, protéines,
            lipides. Deux ordres différents pour la même information se lisent
            comme deux informations. */}
        <div className={styles.macros}>
          <div className={styles.macro}>
            <b>{totalRepas.carbsG} g</b>
            <span>Glucides</span>
          </div>
          <div className={styles.macro}>
            <b>{totalRepas.proteinG} g</b>
            <span>Protéines</span>
          </div>
          <div className={styles.macro}>
            <b>{totalRepas.fatG} g</b>
            <span>Lipides</span>
          </div>
        </div>
        {/* De quoi la journée est faite : les trois nombres ci-dessus disent
            des grammes, la barre dit des proportions. Un gramme de lipide pèse
            plus du double d'un gramme de glucide, donc les deux ne se déduisent
            pas l'un de l'autre. */}
        <MacroBar macros={totalRepas} labels="parts" />
        <p className={styles.fieldHint}>{target.note}</p>
        {ciblesEnAttente !== null && (
          /*
           * DIRE SUR PLACE POURQUOI LES CHIFFRES SAISIS NE SONT PAS LÀ.
           *
           * La règle d'arbitrage n'était écrite que dans les Réglages, deux
           * écrans plus loin : « ce que tu poses ici ne sera utilisé que si
           * tu masques le plan ». Celui qui regarde l'onglet Nutrition ne la
           * voit pas — il lit 3 226 là où il vient de poser 2 800, et il
           * croit que son geste n'a servi à rien.
           *
           * Ce n'est pas une alerte : rien n'est cassé, et le plan a raison
           * de gagner — ses repas sont affichés juste en dessous, et leur
           * somme est ce qui sera réellement mangé. C'est un repère, et il
           * dit où aller.
           */
          <p className={styles.fieldHint}>
            <b>Tes cibles saisies sont en attente</b> —{' '}
            {ciblesEnAttente.kcal.toLocaleString('fr-FR')} kcal pour cette journée. Les chiffres
            ci-dessus viennent de ton plan, et ce sont ses repas qui font foi. Pour passer sur tes
            cibles : Réglages → Plan nutritionnel → masquer.
          </p>
        )}
      </section>

      {/* --- 2. Où en est la journée ---------------------------------------- */}
      <section className={styles.card}>
        <div className={styles.suiviHead}>
          <h2 className={styles.cardTitle}>Aujourd’hui</h2>
          {prisIci > 0 && (
            <button
              type="button"
              className={styles.suiviReset}
              onClick={() =>
                void (async () => {
                  await clearMealsEatenOn(todayIso);
                  setPris(await mealsEatenOn(todayIso));
                })()
              }
            >
              Tout décocher
            </button>
          )}
        </div>
        {/*
            Le grand chiffre est ce qui RESTE, pas ce qui a été pris : c'est la
            question qu'on se pose en ouvrant l'appli à 16 h. Un dépassement
            s'affiche comme tel plutôt qu'en négatif, qui se lit mal d'un
            coup d'œil.
          */}
        <div className={styles.keyStat}>
          <div className={styles.keyStatValue}>
            {Math.abs(restant.kcal).toLocaleString('fr-FR')}
            <span className={styles.keyStatUnit}>
              {restant.kcal < 0 ? ' kcal de trop' : ' kcal restantes'}
            </span>
          </div>
          <div className={styles.keyStatLabel}>
            {consomme.kcal.toLocaleString('fr-FR')} kcal pris sur{' '}
            {prevu.kcal.toLocaleString('fr-FR')} · {prisIci} repas sur {target.meals.length}
          </div>
        </div>
        <MacroProgress consumed={consomme} planned={prevu} />
        <p className={styles.fieldHint}>
          Coche un repas quand tu l’as pris. Ce qui est compté, ce sont tes quantités et tes
          remplacements — rien à ressaisir.
        </p>
      </section>

      {/* --- Carburant du jour : une recommandation, jamais un ajout auto --- */}
      <section className={`${styles.card} ${styles.fuelCard} ${styles[`fuel_${carburant.level}`]}`}>
        <div className={styles.fuelHead}>
          {/*
            Une pastille dessinée, pas l'émoji du plan. Le cercle rouge de
            20 px se lisait comme une alerte à côté d'un titre qui dit
            simplement « séance exigeante ». L'émoji reste dans les données :
            c'est la transcription du plan, et il sert ailleurs.
          */}
          <span className={styles.fuelDot} aria-hidden="true" />
          <span>
            <b className={styles.fuelTitle}>{carburant.title}</b>
            <span className={styles.fuelSubtitle}>{carburant.subtitle}</span>
          </span>
        </div>

        {carburant.foods.length > 0 && (
          <>
            <ul className={styles.fuelFoods}>
              {carburant.foods.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <div className={styles.fuelAmounts}>
              <span className="tnum">{carburant.kcalLabel}</span>
              <span className="tnum">{carburant.carbsLabel}</span>
            </div>
            {/*
              Les trois lignes séparées que Guillaume a demandées : le bonus ne
              doit jamais se fondre dans le plan de base.
            */}
            <dl className={styles.fuelTotals}>
              <dt>Plan de base</dt>
              <dd className="tnum">≈ {baseAujourdhui.kcal.toLocaleString('fr-FR')} kcal</dd>
              <dt>Bonus séance</dt>
              <dd className="tnum">≈ +{carburant.kcal} kcal</dd>
              <dt>Total avec bonus</dt>
              <dd className="tnum">
                ≈ {(baseAujourdhui.kcal + carburant.kcal).toLocaleString('fr-FR')} kcal
              </dd>
            </dl>
          </>
        )}

        <p className={styles.fuelMessage}>{carburant.message}</p>
        {carburant.foods.length > 0 && (
          <p className={styles.fieldHint}>
            Une recommandation, pas une obligation : tu la prends selon ta faim, ta fatigue et
            l’évolution de ton poids. Protéines et lipides ne bougent jamais.
          </p>
        )}
      </section>

      {/* --- 4. Suggestion d'ajustement ------------------------------------ */}
      {advice.kind !== 'none' && (
        <p
          className={`${styles.alert} ${advice.kind === 'add' ? styles.alertVert : styles.alertRouge}`}
        >
          <b>{advice.title}.</b> {advice.action}
        </p>
      )}

      {/* --- Sélecteur des deux paliers ------------------------------------ */}
      {/*
        Le sélecteur ne sert pas qu'à regarder : il DÉCLARE la journée. Une
        séance faite un jeudi que le programme donne en repos doit se manger
        comme une séance, et ses repas doivent pouvoir se cocher. Choisir le
        palier du programme efface le choix plutôt que de l'enregistrer.
      */}
      <div className={styles.segment} role="group" aria-label="Palier alimentaire">
        {(['train', 'rest'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={`${styles.segmentButton} ${kind === k ? styles.segmentOn : ''}`}
            onClick={() =>
              void (async () => {
                setKind(k);
                await setDayKindOverride(todayIso, k === kindProgramme ? null : k);
                onDayKindChange();
              })()
            }
            aria-pressed={kind === k}
          >
            {NUTRITION_TARGETS[k].label}
          </button>
        ))}
      </div>
      {kind !== kindProgramme && (
        <div className={`${styles.phaseNote} ${styles.choixNote}`}>
          <span>
            Le programme prévoit {NUTRITION_TARGETS[kindProgramme].label.toLowerCase()} aujourd’hui.
            Tu as choisi l’autre palier : c’est lui qui compte, et ses repas se cochent.
          </span>
          <button
            type="button"
            className={styles.suiviReset}
            onClick={() =>
              void (async () => {
                setKind(kindProgramme);
                await setDayKindOverride(todayIso, null);
                onDayKindChange();
              })()
            }
          >
            Revenir au programme
          </button>
        </div>
      )}

      {ajoutPour && (
        <AddFoodSheet
          mealName={ajoutPour.name}
          customs={customs}
          preferes={preferes}
          onAdd={(food, qty) =>
            void (async () => {
              await addExtra(todayIso, ajoutPour.id, qty, food);
              setExtras(await extrasOn(todayIso));
            })()
          }
          onCreateCustom={(food) =>
            void (async () => {
              await saveCustomFood({
                foodId: food.id,
                label: food.label,
                unit: food.unit,
                per: food.per,
                kcal: food.kcal,
                proteinG: food.proteinG,
                carbsG: food.carbsG,
                fatG: food.fatG,
                referenceState: food.referenceState,
                category: food.category,
                addedAt: new Date().toISOString().slice(0, 10),
              });
              setCustoms(await chargerCustoms());
            })()
          }
          onClose={() => setAjoutPour(null)}
        />
      )}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Repas types</h2>
        <div className={styles.mealList}>
          {target.meals.map((m) => {
            /* Calculé une fois : la ligne de kcal et la barre doivent parler du
               même repas, remplacements et étiquettes corrigées compris. */
            const planDuRepas = mealMacros(m, overrides, catalogue);
            /*
             * Les ajouts COMPTENT dans le chiffre du repas.
             *
             * Ils entraient déjà dans « kcal restantes », en haut de l'écran,
             * mais pas ici : on ajoutait un aliment à un repas, et le total
             * affiché sur ce même repas ne bougeait pas. Le geste semblait
             * n'avoir servi à rien. Le chiffre du repas et le total de la
             * liste disent maintenant ce qui est réellement dans l'assiette.
             */
            const ajoutsDuRepas = extrasTotal(extras.filter((x) => x.mealId === m.id));
            const macros = additionner(planDuRepas, ajoutsDuRepas);
            return (
              <div key={m.name} className={styles.meal}>
                <div className={styles.mealRow}>
                  <div className={styles.mealBody}>
                    <div className={styles.mealName}>{m.name}</div>
                    {/* De quoi ce repas est fait, et ce qu'il pèse dans la journée.
                    Le résumé d'abord, le détail en dessous — et après un
                    remplacement d'aliment, la barre bouge sous les yeux. */}
                    <MacroBar macros={macros} />
                    {/*
                  La phrase du .md disparaît dès que le repas est décomposé :
                  elle dit « 280 g de skyr » alors que la ligne en dessous peut
                  dire 400 g. Deux versions du même repas à l'écran, c'est
                  exactement l'incohérence qu'on vient de chasser des totaux.
                */}
                    {!m.items && <div className={styles.mealDetail}>{m.detail}</div>}
                  </div>
                  {/* Les deux nombres qui disent ce que ce repas PÈSE, ensemble :
                  ses calories, et sa part de la journée. */}
                  <div className={`${styles.mealKcal} tnum`}>
                    <div>{macros.kcal} kcal</div>
                    <div className={styles.mealPart}>
                      {shareOfDay(macros.kcal, totalAvecAjouts.kcal)} %
                    </div>
                  </div>
                  {/*
                La coche est toujours là. Elle ne l'était que sur le palier du
                programme, ce qui rendait impossible de valider ses repas un
                jour détourné — exactement le cas où l'on en a besoin. Une
                cible de 48 px, comme tout ce qui se touche.
              */}
                  {
                    <button
                      type="button"
                      className={styles.mealTick}
                      aria-pressed={pris.has(m.id)}
                      aria-label={`${m.name} — ${pris.has(m.id) ? 'pris' : 'pas encore pris'}`}
                      onClick={() =>
                        void (async () => {
                          await setMealEaten(todayIso, m.id, !pris.has(m.id));
                          setPris(await mealsEatenOn(todayIso));
                        })()
                      }
                    >
                      {/* Le bouton fait 48 px pour le pouce, le cercle 26 pour
                      l'œil : une pastille de la taille de la cible tactile
                      écraserait le nom du repas à côté. */}
                      <span
                        className={`${styles.mealTickDot} ${
                          pris.has(m.id) ? styles.mealTickOn : ''
                        }`}
                        aria-hidden="true"
                      >
                        {pris.has(m.id) && <Icon name="check" size="17px" />}
                      </span>
                    </button>
                  }
                </div>

                {/*
                  La liste des aliments occupe TOUTE la largeur de la carte,
                  sous la ligne du repas.

                  Elle vivait dans la colonne de gauche, celle que se partagent
                  le nom du repas, sa barre de macros, ses calories et sa coche
                  — il lui restait 60 % de la carte. « Poulet cuit » et
                  « 150 g cuit » y passaient chacun sur deux lignes, et un
                  repas de trois aliments occupait la hauteur de six.

                  Même raison que pour les ajouts juste en dessous, sortis de
                  cette colonne pour la même raison avant elle.
                */}
                <MealItems
                  meal={m}
                  overrides={overrides}
                  customs={customs}
                  catalogue={catalogue}
                  onSave={async (foodId, patch) => {
                    await saveFoodOverride(foodId, patch);
                    setOverrides(await allFoodOverrides());
                  }}
                  onReset={async (foodId) => {
                    await resetFoodOverrides(foodId);
                    setOverrides(await allFoodOverrides());
                  }}
                  onCreateCustom={async (food) => {
                    await saveCustomFood({
                      foodId: food.id,
                      label: food.label,
                      unit: food.unit,
                      per: food.per,
                      kcal: food.kcal,
                      proteinG: food.proteinG,
                      carbsG: food.carbsG,
                      fatG: food.fatG,
                      referenceState: food.referenceState,
                      category: food.category,
                      addedAt: new Date().toISOString().slice(0, 10),
                    });
                    setCustoms(await chargerCustoms());
                  }}
                />

                {/*
                Les ajouts et leur bouton occupent toute la largeur, sous la
                ligne du repas. Dans la colonne de gauche ils n'avaient que
                210 px — assez pour afficher « Confi… » à la place de
                « Confiture ».
              */}
                <div className={styles.mealExtras}>
                  <ExtrasDuRepas
                    extras={extras.filter((x) => x.mealId === m.id)}
                    onRemove={async (id) => {
                      await removeExtra(id);
                      setExtras(await extrasOn(todayIso));
                    }}
                  />
                  <button
                    type="button"
                    className={styles.addFood}
                    onClick={() => setAjoutPour({ id: m.id, name: m.name })}
                  >
                    + Ajouter un aliment
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {/*
          On affiche la SOMME des repas listés, pas la cible. Les deux diffèrent
          de 830 kcal dans le .md : montrer la cible sous une liste qui ne
          l'atteint pas laisserait croire que manger ces cinq repas suffit.
        */}
        {Object.keys(overrides).length > 0 && (
          <button
            type="button"
            className={styles.secondary}
            style={{ width: '100%', margin: '10px 0 0' }}
            onClick={() =>
              void (async () => {
                await resetFoodOverrides();
                setOverrides(await allFoodOverrides());
              })()
            }
          >
            Réinitialiser aux valeurs par défaut ({Object.keys(overrides).length})
          </button>
        )}
        <div className={styles.mealTotal}>
          <span>
            {ajoutsDuJour.kcal > 0 ? 'Total des repas, ajouts compris' : 'Total des repas listés'}
          </span>
          <span className="tnum">
            ≈ {totalAvecAjouts.kcal.toLocaleString('fr-FR')} kcal · {totalAvecAjouts.proteinG} g
          </span>
        </div>
        {ajoutsDuJour.kcal > 0 && (
          <p className={styles.fieldHint}>
            Dont {ajoutsDuJour.kcal.toLocaleString('fr-FR')} kcal d’aliments ajoutés. Le plan seul
            fait {totalRepas.kcal.toLocaleString('fr-FR')} kcal.
          </p>
        )}
        {/*
          Le SENS de l'écart décide du message, pas seulement sa taille. Avant,
          l'alerte disait « il manque N kcal » dans les deux cas, en prenant la
          valeur absolue : un excédent s'annonçait comme un manque, et le conseil
          proposait d'ajouter du féculent à quelqu'un qui en avait déjà trop.
        */}
        {verdict === 'deficit' && (
          <p className={`${styles.alert} ${styles.alertRouge}`} style={{ margin: '12px 0 0' }}>
            <b>
              Il manque {Math.abs(ecart.kcal).toLocaleString('fr-FR')} kcal pour atteindre la cible
              de {target.kcal.toLocaleString('fr-FR')}.
            </b>{' '}
            Ces portions te font manger {fr(Math.abs(ecart.pct))} % de <b>moins</b> que prévu — à ce
            niveau tu ne prendras pas de poids. Il faudrait environ{' '}
            {starchToCloseGap(ecart.kcal).toLocaleString('fr-FR')} g de féculent cuit en plus sur la
            journée : à ce volume, une sixième prise est plus tenable que des assiettes plus
            grosses.
          </p>
        )}
        {verdict === 'surplus' && (
          <p className={styles.alert} style={{ margin: '12px 0 0' }}>
            <b>
              Tu dépasses la cible de {ecart.kcal.toLocaleString('fr-FR')} kcal (
              {target.kcal.toLocaleString('fr-FR')} visées).
            </b>{' '}
            Ces portions te font manger {fr(Math.abs(ecart.pct))} % de <b>plus</b> que prévu —
            au-delà de la cible, ce que tu prends en trop part surtout en gras. Il faudrait retirer
            environ {starchToCloseGap(ecart.kcal).toLocaleString('fr-FR')} g de féculent cuit sur la
            journée. Vérifie aussi les lignes marquées « modifié » : une étiquette mal recopiée se
            voit ici avant de se voir sur la balance.
          </p>
        )}
        {verdict === 'ok' && (
          <p className={styles.fieldHint}>
            Ajuste les féculents de ±30 g selon la faim et ta moyenne hebdomadaire. Les quantités
            sont des repères, pas des lois.
          </p>
        )}
      </section>

      {/* --- 2 et 3. Suivi de poids et tour de taille ----------------------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Pesée du matin</h2>
        <p className={styles.cardSub}>
          Au réveil, avant de manger ou de boire. Idéalement 4 à 7 fois par semaine — mais une seule
          fois suffit à faire tourner la moyenne.
        </p>
        <div className={styles.field}>
          <Stepper
            label={`Poids — ${humanDate(todayIso)}`}
            value={todayRow.weightKg}
            step={0.1}
            min={40}
            max={160}
            unit="kg"
            tone="accent"
            onStep={(d) =>
              void patchToday({
                weightKg: stepValue(todayRow.weightKg, d, 40, 160),
              })
            }
            onCommit={(v) => void patchToday({ weightKg: v })}
          />
        </div>
        <div className={styles.field}>
          <Stepper
            label="Tour de taille"
            value={todayRow.waistCm}
            step={0.5}
            min={60}
            max={150}
            unit="cm"
            onStep={(d) =>
              void patchToday({
                waistCm: stepValue(todayRow.waistCm, d, 60, 150),
              })
            }
            onCommit={(v) => void patchToday({ waistCm: v })}
          />
          <p className={styles.fieldHint}>
            Optionnel, toutes les 1 à 2 semaines, même repère et même moment. Il ne sert qu'à
            trancher un cas ambigu : poids qui monte, tour de taille qui suit.
          </p>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Moyenne 7 jours</h2>
        <p className={styles.cardSub}>
          Une pesée isolée bouge de 1 à 2 kg selon l’hydratation, le sel de la veille, le transit.
          Seule la moyenne veut dire quelque chose.
        </p>
        <div className={styles.keyStat}>
          <div className={styles.keyStatValue}>
            {trend.average7 === null ? '—' : `${fr(trend.average7)}`}
            <span className={styles.keyStatUnit}> kg</span>
          </div>
          <div className={styles.keyStatLabel}>
            {trend.average7 === null
              ? 'Saisis ta première pesée pour lancer le suivi.'
              : trend.deltaKg === null
                ? `${trend.countThisWeek} pesée${trend.countThisWeek > 1 ? 's' : ''} cette semaine. Il faut une semaine de plus pour comparer.`
                : `${trend.deltaKg > 0 ? '+' : ''}${fr(trend.deltaKg)} kg vs la semaine précédente · ${trend.countThisWeek} pesée${trend.countThisWeek > 1 ? 's' : ''}`}
          </div>
        </div>
        {trend.deltaKg !== null && (
          <p
            className={styles.fieldHint}
            style={{ color: trend.onTarget ? 'var(--vert)' : undefined }}
          >
            {trend.onTarget
              ? `Dans la fourchette visée (+${fr(TARGET_GAIN_KG_PER_WEEK.min)} à +${fr(TARGET_GAIN_KG_PER_WEEK.max)} kg par semaine).`
              : `Fourchette visée : +${fr(TARGET_GAIN_KG_PER_WEEK.min)} à +${fr(TARGET_GAIN_KG_PER_WEEK.max)} kg par semaine. Viser 80-81 kg avec de meilleures performances vaut mieux que forcer jusqu’à 84.`}
          </p>
        )}
        {waist !== null && (
          <p className={styles.fieldHint}>
            Dernier tour de taille : <b>{fr(waist)} cm</b>.
          </p>
        )}
        <LineChart
          series={series}
          xLabels={xLabels}
          unit="kg"
          emptyMessage="Pas encore assez de pesées pour tracer une tendance."
        />
      </section>

      {/* --- Le détail, replié ---------------------------------------------- */}
      <details className={styles.details}>
        <summary className={styles.summary}>Liste de courses</summary>
        <div className={styles.detailsBody}>
          {SHOPPING_LIST.map((g) => (
            <p key={g.title}>
              <b>{g.title}</b> — {g.items}
            </p>
          ))}
        </div>
      </details>

      <details className={styles.details}>
        <summary className={styles.summary}>Règles simples</summary>
        <div className={styles.detailsBody}>
          <ol className={styles.ruleList}>
            {SIMPLE_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </div>
      </details>

      <details className={styles.details}>
        <summary className={styles.summary}>Compléments et hydratation</summary>
        <div className={styles.detailsBody}>
          <p>{SUPPLEMENTS_NOTE}</p>
          <p>{HYDRATION_NOTE}</p>
        </div>
      </details>
    </div>
  );
}

/**
 * Les aliments personnalisés, sous la même forme que ceux de la bibliothèque.
 *
 * C'est ce qui permet au remplacement de les traiter indifféremment : une
 * seule liste, un seul chemin de calcul.
 */
async function chargerCustoms(): Promise<LibraryFood[]> {
  return (await allCustomFoods()).map((r) => ({
    id: r.foodId,
    label: r.label,
    unit: r.unit,
    per: r.per,
    kcal: r.kcal,
    proteinG: r.proteinG,
    carbsG: r.carbsG,
    fatG: r.fatG,
    referenceState: r.referenceState,
    category: r.category as LibraryFood['category'],
    isCustom: true,
  }));
}

/**
 * Les aliments mangés en plus d'un repas.
 *
 * Rien ne s'affiche quand il n'y en a pas : un bloc « aucun ajout » sous
 * chacun des cinq repas ferait cinq lignes vides à faire défiler chaque jour.
 *
 * Chaque ligne se retire d'un geste. C'est la contrepartie d'un ajout qui
 * compte immédiatement dans la journée : si l'ajout est faux, il doit pouvoir
 * disparaître aussi vite qu'il est apparu.
 */
function ExtrasDuRepas({
  extras,
  onRemove,
}: {
  /*
   * Chaque ligne porte déjà son nom et sa composition : ni catalogue ni
   * corrections d'étiquette n'entrent ici. C'est exactement ce qui fait qu'un
   * changement de marque ne réécrit pas les journées passées.
   */
  extras: ExtraFoodRow[];
  onRemove: (id: number) => Promise<void>;
}) {
  if (extras.length === 0) return null;
  return (
    <ul className={styles.extraList}>
      {/*
        Un intertitre pour tout le groupe, et pas un badge par ligne : sur 390
        px, un badge « ajouté » sur chaque ligne rognait le nom de l'aliment
        au point d'afficher « Confitu ». Dit une fois, c'est aussi clair.
      */}
      <li className={styles.extraTitre}>En plus du plan</li>
      {extras.map((x) => {
        const macros = extraMacros(x);
        return (
          <li key={x.id} className={styles.extraRow}>
            <span className={styles.extraName}>{x.label}</span>
            <span className={`${styles.extraQty} tnum`}>
              {fr(x.qty)} {x.unit === 'unité' ? '' : x.unit}
            </span>
            <span className={`${styles.extraKcal} tnum`}>{Math.round(macros.kcal)} kcal</span>
            <button
              type="button"
              className={styles.extraRemove}
              aria-label={`Retirer ${x.label}`}
              onClick={() => void onRemove(x.id!)}
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}
