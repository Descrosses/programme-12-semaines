import { useMemo, useState } from 'react';
import {
  CATEGORY_LABELS,
  foodsByCategory,
  foodsPreferes,
  searchFoods,
  stateLabel,
  type LibraryFood,
} from '../data/foodLibrary';
import type { FoodCategory } from '../data/nutrition';
import { kcalFromMacros, macroCoherence, MACRO_COHERENCE_TOLERANCE_PCT } from '../engine/nutrition';
import { lireDecimal } from './MealItems';
import styles from '../screens/Screens.module.css';

/**
 * « Remplacer le poulet » — la feuille de choix d'un aliment.
 *
 * Deux chemins, et un seul geste pour chacun :
 *   - l'aliment existe → on le touche, ses valeurs viennent toutes seules ;
 *   - il n'existe pas → on le saisit POUR 100 G, et il rejoint la bibliothèque.
 *
 * Ce qu'elle ne fait pas : demander des calories quand l'aliment est connu. La
 * portion se recalcule depuis la composition, jamais à la main.
 *
 * La quantité n'est PAS demandée ici : elle est déjà dans la ligne, juste
 * derrière, et le remplacement la conserve. Un écran de moins à traverser.
 */
export function FoodSwapSheet({
  label,
  category,
  customs,
  onPick,
  onCreate,
  onClose,
}: {
  /*
   * LE LIBELLÉ ET LA FAMILLE, PAS LA LIGNE.
   *
   * Cette feuille prenait un `FoodItem`, le type des lignes du plan
   * historique. Elle n'en lisait pourtant que deux champs — le nom affiché
   * et la famille d'ouverture du sélecteur. Ce couplage la réservait au
   * plan historique, alors que le plan composé par la personne a
   * exactement le même besoin.
   *
   * Deux chaînes suffisent. Le plan historique passe `item.label` et
   * `item.category`, le plan composé passe ceux de son aliment, et le
   * sélecteur en dessous n'a pas changé d'une ligne.
   */
  label: string;
  category: FoodCategory;
  customs: LibraryFood[];
  onPick: (foodId: string) => void;
  onCreate: (food: LibraryFood) => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.sheet} role="dialog" aria-label={`Remplacer ${label}`}>
      <div className={styles.sheetHead}>
        <h3 className={styles.sheetTitle}>Remplacer {label}</h3>
        <button type="button" className={styles.sheetClose} onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </div>

      <FoodPicker
        customs={customs}
        categorieParDefaut={category}
        suggestion={label}
        onPick={onPick}
        onCreate={(f) => {
          onCreate(f);
          onPick(f.id);
        }}
      />
    </div>
  );
}

/**
 * Chercher un aliment, ou en créer un.
 *
 * Partagé entre le remplacement d'une ligne du plan et l'ajout d'un aliment
 * mangé en plus : c'est le même geste, et deux listes d'aliments qui
 * divergeraient seraient la pire façon de s'en apercevoir.
 */
/**
 * « Mes aliments » n'est pas une famille du catalogue, c'est un onglet de
 * plus. D'où ce type local plutôt qu'un neuvième `FoodCategory` : une
 * préférence personnelle n'a rien à faire dans la classification des
 * aliments, et l'y mettre aurait contaminé tout ce qui range par famille.
 */
type Onglet = FoodCategory | 'preferes';

export function FoodPicker({
  customs,
  categorieParDefaut,
  suggestion,
  preferes = [],
  onPick,
  onCreate,
}: {
  customs: LibraryFood[];
  /** La famille ouverte quand rien n'est tapé. */
  categorieParDefaut: FoodCategory;
  /** Nom pré-rempli du formulaire de création. */
  suggestion: string;
  /**
   * Les aliments déclarés par la personne, s'il y en a.
   *
   * Ils n'enlèvent rien : tout le catalogue reste accessible par les autres
   * onglets et par la recherche. Ils évitent seulement de faire défiler
   * cinquante lignes pour retrouver les six qu'on mange vraiment.
   */
  preferes?: readonly string[];
  onPick: (foodId: string) => void;
  onCreate: (food: LibraryFood) => void;
}) {
  const [query, setQuery] = useState('');
  const [onglet, setOnglet] = useState<Onglet | null>(null);
  const [creation, setCreation] = useState(false);

  const mesAliments = useMemo(() => foodsPreferes(preferes, customs), [preferes, customs]);
  /* L'onglet ouvert par défaut : « Mes aliments » quand il y en a, puisque
     c'est là que se trouve presque toujours ce qu'on cherche. */
  const defaut: Onglet = mesAliments.length > 0 ? 'preferes' : categorieParDefaut;
  const actif: Onglet = onglet ?? defaut;

  const resultats = useMemo(() => {
    if (query.trim() !== '') return searchFoods(query, customs);
    if (actif === 'preferes') return mesAliments;
    return foodsByCategory(actif, customs);
  }, [query, actif, customs, mesAliments]);

  return (
    <>
      {creation ? (
        <CustomFoodForm
          suggestion={suggestion}
          onCancel={() => setCreation(false)}
          onCreate={onCreate}
        />
      ) : (
        <>
          <input
            className={styles.input}
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Chercher un aliment…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {query.trim() === '' && (
            <div className={styles.chips}>
              {mesAliments.length > 0 && (
                <button
                  type="button"
                  className={`${styles.chip} ${actif === 'preferes' ? styles.chipOn : ''}`}
                  onClick={() => setOnglet('preferes')}
                >
                  Mes aliments
                </button>
              )}
              {(Object.keys(CATEGORY_LABELS) as FoodCategory[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.chip} ${actif === c ? styles.chipOn : ''}`}
                  onClick={() => setOnglet(c)}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          )}

          <ul className={styles.foodChoices}>
            {resultats.map((f) => (
              <li key={f.id}>
                <button type="button" className={styles.foodChoice} onClick={() => onPick(f.id)}>
                  <span className={styles.foodChoiceName}>
                    {f.label}
                    {f.isCustom && <span className={styles.foodBadge}>à moi</span>}
                  </span>
                  {/* L'état de référence est dit ICI, au moment du choix : c'est
                      là qu'une confusion cru/cuit se joue, pas après. */}
                  <span className={`${styles.foodChoiceMacros} tnum`}>
                    {Math.round(f.kcal)} kcal
                    {f.per === 1 ? ' / unité' : ' / 100 g'}
                    {stateLabel(f.referenceState) ? ` · ${stateLabel(f.referenceState)}` : ''}
                  </span>
                </button>
              </li>
            ))}
            {resultats.length === 0 && (
              <li className={styles.fieldHint}>Aucun aliment ne correspond.</li>
            )}
          </ul>

          <button type="button" className={styles.secondary} onClick={() => setCreation(true)}>
            + Ajouter un aliment personnalisé
          </button>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

/**
 * Saisie d'un aliment absent de la bibliothèque.
 *
 * Les valeurs demandées sont celles de l'ÉTIQUETTE — pour 100 g, ou par unité.
 * Jamais celles de la portion : c'est l'appli qui fait cette multiplication, et
 * la lui laisser est tout l'intérêt.
 */
function CustomFoodForm({
  suggestion,
  onCreate,
  onCancel,
}: {
  suggestion: string;
  onCreate: (food: LibraryFood) => void;
  onCancel: () => void;
}) {
  const [nom, setNom] = useState('');
  const [etat, setEtat] = useState<'cru' | 'cuit' | 'na'>('na');
  const [categorie, setCategorie] = useState<FoodCategory>('autre');
  const [parUnite, setParUnite] = useState(false);
  const [champs, setChamps] = useState({
    kcal: '',
    proteinG: '',
    carbsG: '',
    fatG: '',
  });

  const lu = {
    kcal: lireDecimal(champs.kcal),
    proteinG: lireDecimal(champs.proteinG),
    carbsG: lireDecimal(champs.carbsG),
    fatG: lireDecimal(champs.fatG),
  };
  const complet = nom.trim() !== '' && Object.values(lu).every((v) => v !== null);

  /*
   * Contrôle non bloquant : les kcal tapées doivent valoir ce que valent les
   * macros tapées. On ne corrige rien — on signale. Le même calcul que pour les
   * aliments du plan, pour que les deux saisies se comportent pareil.
   */
  const coherence = complet
    ? macroCoherence({
        kcal: lu.kcal!,
        proteinG: lu.proteinG!,
        carbsG: lu.carbsG!,
        fatG: lu.fatG!,
      })
    : null;
  const douteux =
    coherence !== null && Math.abs(coherence.ecartPct) > MACRO_COHERENCE_TOLERANCE_PCT;

  function creer() {
    if (!complet) return;
    const label = nom.trim();
    onCreate({
      id: `custom.${slug(label)}`,
      label,
      unit: parUnite ? 'unité' : 'g',
      per: parUnite ? 1 : 100,
      kcal: lu.kcal!,
      proteinG: lu.proteinG!,
      carbsG: lu.carbsG!,
      fatG: lu.fatG!,
      referenceState: etat,
      category: categorie,
      isCustom: true,
    });
  }

  return (
    <div className={styles.foodEdit}>
      <label className={styles.foodField}>
        <span className={styles.foodFieldLabel}>Nom de l’aliment</span>
        <input
          className={styles.input}
          type="text"
          autoComplete="off"
          placeholder={suggestion}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
      </label>

      <div className={styles.chips} style={{ marginTop: 10 }}>
        {(['na', 'cru', 'cuit'] as const).map((e) => (
          <button
            key={e}
            type="button"
            className={`${styles.chip} ${etat === e ? styles.chipOn : ''}`}
            onClick={() => setEtat(e)}
          >
            {e === 'na' ? 'Sans objet' : e === 'cru' ? 'Pesé cru' : 'Pesé cuit'}
          </button>
        ))}
      </div>

      <div className={styles.chips}>
        {(Object.keys(CATEGORY_LABELS) as FoodCategory[]).map((c) => (
          <button
            key={c}
            type="button"
            className={`${styles.chip} ${categorie === c ? styles.chipOn : ''}`}
            onClick={() => setCategorie(c)}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className={styles.chips}>
        <button
          type="button"
          className={`${styles.chip} ${!parUnite ? styles.chipOn : ''}`}
          onClick={() => setParUnite(false)}
        >
          Pour 100 g
        </button>
        <button
          type="button"
          className={`${styles.chip} ${parUnite ? styles.chipOn : ''}`}
          onClick={() => setParUnite(true)}
        >
          Par unité
        </button>
      </div>

      <p className={styles.fieldHint} style={{ margin: '10px 0' }}>
        Recopie l’étiquette <b>{parUnite ? 'par unité' : 'pour 100 g'}</b>. La portion se calcule
        toute seule.
      </p>

      <div className={styles.foodGrid}>
        {CHAMPS.map((c) => (
          <label key={c.cle} className={styles.foodField}>
            <span className={styles.foodFieldLabel}>{c.label}</span>
            <input
              className={styles.input}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={champs[c.cle]}
              onChange={(e) => setChamps((x) => ({ ...x, [c.cle]: e.target.value }))}
            />
          </label>
        ))}
      </div>

      {douteux && coherence && (
        <p className={`${styles.alert} ${styles.alertRouge}`} style={{ margin: '12px 0 0' }}>
          <b>Vérifie les valeurs saisies.</b> Tes macros valent{' '}
          {Math.round(
            kcalFromMacros({
              proteinG: lu.proteinG!,
              carbsG: lu.carbsG!,
              fatG: lu.fatG!,
            }),
          )}{' '}
          kcal, pas {lu.kcal}. L’aliment sera quand même enregistré tel que tu l’as écrit.
        </p>
      )}

      <div className={styles.foodActions}>
        <button type="button" className={styles.primary} disabled={!complet} onClick={creer}>
          Utiliser cet aliment
        </button>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Retour
        </button>
      </div>
    </div>
  );
}

const CHAMPS = [
  { cle: 'kcal', label: 'kcal' },
  { cle: 'proteinG', label: 'Protéines' },
  { cle: 'carbsG', label: 'Glucides' },
  { cle: 'fatG', label: 'Lipides' },
] as const;

/** Un identifiant stable tiré du nom : deux saisies du même nom se corrigent. */
function slug(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
