import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Icon, type IconName } from './components/Icon';
import { RestBar } from './components/RestBar';
import type { DayIndex, WeekIndex } from './data/types';
import { AccueilScreen } from './screens/AccueilScreen';
import { CatalogueScreen } from './screens/CatalogueScreen';
import { ParcoursScreen } from './screens/ParcoursScreen';
import { CombineScreen } from './screens/CombineScreen';
import { MesuresScreen } from './screens/MesuresScreen';
import { NutritionPrincipesScreen } from './screens/NutritionPrincipesScreen';
import { ProgressVolumeScreen } from './screens/ProgressVolumeScreen';
import { NutritionScreen } from './screens/NutritionScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { SessionScreen } from './screens/SessionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TodayScreen } from './screens/TodayScreen';
import { WeekScreen } from './screens/WeekScreen';
import { modulePourCycle } from './programmes/registre';
import type { ModuleProgramme, OngletProgramme } from './programmes/types';
import { themePour } from './state/theme';
import { useAppUpdate } from './state/useAppUpdate';
import { useRestTimer } from './state/useRestTimer';
import { useRoute, type Route } from './state/useRoute';
import { weekForTab, writeLastWeek } from './state/lastWeek';
import { useViewportOffset } from './state/useViewportOffset';
import { currentWeek, locateToday } from './engine/calendar';
import { cycleActif, dayKindOverride, getSettingsRow } from './db/repo';
import type { DayKind } from './data/nutrition';
import styles from './App.module.css';

type PlateformeName = 'accueil' | 'catalogue' | 'parcours';

/*
 * La barre du bas N'EST PLUS ÉCRITE ICI.
 *
 * Elle l'a été longtemps, et c'était juste tant qu'il n'existait qu'un
 * programme. Dès qu'un second est arrivé, cette liste en dur lui a imposé les
 * onglets du premier : un cycle MASS affichait un onglet Combine qui réclame
 * des 1RM à un programme qui n'en prescrit aucun, et un onglet Progrès qui
 * traçait une courbe de développé couché dans un programme où le développé
 * couché ne figure pas.
 *
 * Chaque programme déclare donc ses propres onglets dans son module
 * (`programmes/types.ts`), et l'application lit cette liste. POWER 12 déclare
 * exactement les six onglets qu'il avait : rien n'a bougé de son côté.
 */

/*
 * La barre de la PLATEFORME, et non celle du programme.
 *
 * Deux barres plutôt qu'une seule à huit entrées : les onglets de POWER 12
 * servent à mener une séance, ceux-ci à choisir ce qu'on fait. Les mélanger
 * donnerait une barre où « Nutrition » et « Catalogue » voisinent sans rapport
 * l'un avec l'autre, et obligerait à toucher la navigation de POWER 12 —
 * exactement ce que le brief interdit.
 */
const PLATEFORME: Array<{ name: PlateformeName; label: string; icon: IconName }> = [
  { name: 'accueil', label: 'Accueil', icon: 'home' },
  { name: 'catalogue', label: 'Programmes', icon: 'book' },
  { name: 'parcours', label: 'Parcours', icon: 'repeat' },
];

/**
 * Les routes qui désignent un onglet de programme.
 *
 * Sert à distinguer « cette adresse est un onglet qui n'existe pas dans ce
 * programme » — on ramène alors à la séance du jour — de « cette adresse
 * n'est pas un onglet du tout », comme une séance ou le catalogue, qu'il ne
 * faut surtout pas détourner.
 */
const ONGLETS_POSSIBLES = new Set<Route['name']>([
  'today',
  'week',
  'nutrition',
  'progress',
  'combine',
  'mesures',
  'settings',
]);

export function App() {
  const [alerts, setAlerts] = useState({ sound: true, vibration: true });
  /**
   * Jour d'entraînement ou jour de repos, au sens du plan alimentaire.
   *
   * Calculé ici et non dans l'écran Nutrition : l'écran Aujourd'hui en a besoin
   * aussi pour sa carte de raccourci, et deux calculs séparés finiraient par
   * diverger. Une séance prévue aujourd'hui = jour d'entraînement, le reste
   * (mardi, jeudi, avant le début, après la fin) = jour de repos.
   *
   * Un choix enregistré pour la journée l'emporte sur le programme : une séance
   * déplacée au jeudi doit se manger comme une séance, pas comme un repos.
   */
  const [todayKind, setTodayKind] = useState<DayKind>('rest');
  /**
   * Ce que le PROGRAMME prévoit aujourd'hui, avant tout détournement.
   *
   * Gardé à part de `todayKind` : l'écran Nutrition doit pouvoir dire « le
   * programme prévoyait repos » et proposer d'y revenir, ce qu'il ne pourrait
   * plus faire si les deux étaient fondus en une seule valeur.
   */
  const [kindProgramme, setKindProgramme] = useState<DayKind>('rest');
  /**
   * Jour de programme de la séance prévue aujourd'hui, `null` s'il n'y en a
   * pas. Lu ici, à la même source que `todayKind`, pour que la carte de
   * carburant de l'écran Nutrition n'ait pas sa propre idée du planning.
   */
  const [todayDay, setTodayDay] = useState<DayIndex | null>(null);
  /**
   * Semaine de programme en cours, `null` hors programme.
   *
   * C'est elle qui dit à l'écran Nutrition dans quelle PHASE on se trouve — une
   * semaine de deload allège les féculents des jours d'entraînement.
   *
   * Elle vient de `currentWeek` et non de la séance du jour : le mardi d'une
   * semaine de deload est un jour de repos, mais on est bien encore dans cette
   * semaine-là, et le bandeau doit le dire.
   */
  const [todayWeek, setTodayWeek] = useState<WeekIndex | null>(null);
  /**
   * Le module du programme en cours, `null` tant qu'on ne le sait pas encore.
   *
   * `null` plutôt que POWER 12 par défaut : au démarrage à froid, la lecture
   * du cycle actif est asynchrone. Avec POWER 12 comme valeur initiale, un
   * cycle MASS affichait une fraction de seconde la barre de POWER — six
   * onglets dont un Combine — avant de se corriger. La barre est donc
   * simplement absente le temps de la lecture, ce qui ne montre rien de faux.
   */
  const [programme, setProgramme] = useState<ModuleProgramme | null>(null);
  const timer = useRestTimer(alerts);
  const [route, navigate] = useRoute();
  const appUpdate = useAppUpdate();
  /** Incrémenté quand les réglages changent : force les écrans à se recharger. */
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    void (async () => {
      const row = await getSettingsRow();
      setAlerts({ sound: row.soundEnabled, vibration: row.vibrationEnabled });
      const iso = new Date().toISOString().slice(0, 10);
      const moduleDuCycle = modulePourCycle((await cycleActif())?.programmeId ?? null);
      setProgramme(moduleDuCycle);
      const today = locateToday(row.startDate, iso, moduleDuCycle);
      const duProgramme: DayKind = today?.kind === 'session' ? 'train' : 'rest';
      setKindProgramme(duProgramme);
      setTodayKind((await dayKindOverride(iso)) ?? duProgramme);
      setTodayDay(today?.kind === 'session' ? today.session.day : null);
      setTodayWeek(
        currentWeek(row.startDate, new Date().toISOString().slice(0, 10), moduleDuCycle),
      );
    })();
  }, [dataVersion]);

  const openSession = useCallback(
    (week: WeekIndex, day: DayIndex) => navigate({ name: 'session', week, day }),
    [navigate],
  );

  const refresh = useCallback(() => setDataVersion((v) => v + 1), []);

  /*
   * La semaine consultée se retient d'un onglet à l'autre.
   *
   * Elle ne vivait que dans l'URL : en passant par Nutrition, elle disparaissait
   * avec elle, et l'onglet Semaine rouvrait la 1. On la note donc à chaque fois
   * qu'on la regarde, y compris depuis une séance ouverte — c'est bien la
   * semaine où l'on se trouve.
   */
  useEffect(() => {
    if (route.name === 'week' || route.name === 'session') writeLastWeek(route.week);
  }, [route]);

  // Pendant une séance, la barre de navigation disparaît : l'écran est long,
  // le pouce navigue dedans, et une barre de plus multiplierait les appuis ratés.
  const inSession = route.name === 'session';
  // Deux niveaux : la plateforme choisit un programme, le programme mène une
  // séance. Chacun garde sa barre, et on ne voit jamais les deux à la fois.
  const dansPlateforme =
    route.name === 'accueil' || route.name === 'catalogue' || route.name === 'parcours';

  /*
   * L'univers graphique se pose sur la racine du document, et non sur un
   * conteneur React : la barre de navigation, les feuilles modales et la
   * couleur de fond du navigateur vivent toutes en dehors de l'arbre des
   * écrans. Un attribut sur `<html>` les atteint toutes d'un coup.
   */
  useEffect(() => {
    let vivant = true;
    void (async () => {
      const cycle = await cycleActif();
      if (!vivant) return;
      document.documentElement.dataset.theme = themePour(
        cycle?.programmeId ?? null,
        dansPlateforme,
      );
    })();
    return () => {
      vivant = false;
    };
  }, [dansPlateforme, dataVersion]);

  /**
   * L'onglet du programme que la route désigne, `null` si elle n'en désigne
   * aucun.
   *
   * `null` arrive dans deux cas : la route n'est pas un onglet (une séance,
   * l'accueil), ou c'est un onglet d'un AUTRE programme — un `#/combine`
   * gardé en favori puis ouvert pendant un cycle MASS, qui n'a pas de combine.
   */
  const onglet = programme?.onglets.find((o) => o.route === route.name) ?? null;

  /*
   * Une route d'onglet qui n'appartient pas au programme en cours ramène à la
   * séance du jour.
   *
   * Sans ça, `#/combine` sous MASS laissait l'URL sur un onglet inexistant :
   * aucun onglet de la barre n'était marqué actif, et le contenu affiché ne
   * correspondait plus à l'adresse. On remplace l'entrée d'historique plutôt
   * que d'en ajouter une, pour que le bouton Retour ne rebondisse pas.
   */
  useEffect(() => {
    if (programme === null) return;
    const estUnOnglet = ONGLETS_POSSIBLES.has(route.name);
    if (estUnOnglet && !programme.onglets.some((o) => o.route === route.name)) {
      navigate({ name: 'today' }, true);
    }
  }, [programme, route, navigate]);

  /*
   * Sur iOS, un élément en `position: fixed` est ancré au layout viewport, pas
   * à ce qu'on voit. Pendant le défilement, la barre de chrono remontait donc
   * au milieu de l'écran. On publie l'écart ici, une seule fois, et les deux
   * barres du bas s'en servent. Il vaut 0 partout ailleurs.
   */
  const vvOffset = useViewportOffset();

  return (
    <div
      className={inSession ? styles.app : `${styles.app} ${styles.withNav}`}
      style={{ '--vv-offset': `${vvOffset}px` } as CSSProperties}
    >
      {appUpdate.ready && (
        <div className={styles.updateBar} role="status">
          <span>Nouvelle version disponible.</span>
          <button type="button" className={styles.updateButton} onClick={appUpdate.update}>
            Mettre à jour
          </button>
          <button type="button" className={styles.updateLater} onClick={appUpdate.dismiss}>
            Plus tard
          </button>
        </div>
      )}

      <main>
        {renderScreen(
          route,
          programme,
          onglet,
          dataVersion,
          todayKind,
          kindProgramme,
          todayDay,
          todayWeek,
          openSession,
          navigate,
          refresh,
          timer,
        )}
      </main>

      <RestBar timer={timer} />

      {dansPlateforme && (
        <nav className={styles.nav} aria-label="Navigation Dcross-fit">
          {PLATEFORME.map((tab) => {
            const active = route.name === tab.name;
            return (
              <button
                key={tab.name}
                type="button"
                className={`${styles.tab} ${active ? styles.tabOn : ''}`}
                onClick={() => navigate({ name: tab.name })}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.tabIcon}>
                  <Icon name={tab.icon} size="21px" />
                </span>
                <span className={styles.tabLabel}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {!inSession && !dansPlateforme && programme !== null && (
        <nav className={styles.nav} aria-label={`Navigation ${programme.id}`}>
          {programme.onglets.map((tab) => {
            const active = route.name === tab.route;
            return (
              <button
                key={tab.route}
                type="button"
                className={`${styles.tab} ${active ? styles.tabOn : ''}`}
                onClick={() =>
                  navigate(
                    tab.route === 'week'
                      ? { name: 'week', week: weekForTab(route) }
                      : { name: tab.route },
                  )
                }
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.tabIcon}>
                  <Icon name={tab.icon} size="21px" />
                </span>
                <span className={styles.tabLabel}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function renderScreen(
  route: Route,
  programme: ModuleProgramme | null,
  onglet: OngletProgramme | null,
  dataVersion: number,
  todayKind: DayKind,
  kindProgramme: DayKind,
  todayDay: DayIndex | null,
  todayWeek: WeekIndex | null,
  openSession: (week: WeekIndex, day: DayIndex) => void,
  navigate: (route: Route) => void,
  refresh: () => void,
  timer: ReturnType<typeof useRestTimer>,
) {
  switch (route.name) {
    case 'accueil':
      return (
        <AccueilScreen
          key={dataVersion}
          onReprendre={() => navigate({ name: 'today' })}
          onCatalogue={() => navigate({ name: 'catalogue' })}
          onParcours={() => navigate({ name: 'parcours' })}
        />
      );

    case 'catalogue':
      return (
        <CatalogueScreen
          key={dataVersion}
          onOuvrirProgramme={() => navigate({ name: 'today' })}
          onDataChanged={refresh}
        />
      );

    case 'parcours':
      return (
        <ParcoursScreen
          key={dataVersion}
          onOuvrirProgramme={() => navigate({ name: 'today' })}
          onDataChanged={refresh}
        />
      );

    case 'session':
      return (
        <SessionScreen
          key={`${route.week}-${route.day}-${dataVersion}`}
          week={route.week}
          day={route.day}
          timer={timer}
          onBack={() => navigate({ name: 'week', week: route.week })}
        />
      );

    case 'week':
      /*
       * La clé ne porte PAS la semaine : la changer remontait tout l'écran, et
       * la bande des treize semaines repartait de son début — la pastille
       * choisie sortait de l'écran dès la semaine 7. Le chargement des jours
       * dépend déjà de `week` par son effet, aucun remontage n'est nécessaire.
       */
      return (
        <WeekScreen
          key={dataVersion}
          week={route.week}
          onChangeWeek={(w) => navigate({ name: 'week', week: w })}
          onOpen={openSession}
          onGoNutrition={() => navigate({ name: 'nutrition' })}
        />
      );

    default:
      break;
  }

  const today = (
    <TodayScreen
      key={dataVersion}
      onGoAccueil={() => navigate({ name: 'accueil' })}
      onOpen={openSession}
      onGoWeek={(w) => navigate({ name: 'week', week: w })}
      onGoSettings={() => navigate({ name: 'settings' })}
      onGoNutrition={() => navigate({ name: 'nutrition' })}
      onDataChanged={refresh}
      todayKind={todayKind}
    />
  );

  /*
   * Tant que le programme du cycle n'est pas lu, un onglet autre que la séance
   * du jour n'affiche rien.
   *
   * Afficher la séance du jour à sa place ferait clignoter un écran qu'on n'a
   * pas demandé — recharger `#/settings` montrait l'écran Aujourd'hui une
   * fraction de seconde. La séance du jour, elle, s'affiche tout de suite :
   * c'est l'écran d'atterrissage, et il sait se charger seul.
   */
  if (programme === null) return route.name === 'today' ? today : null;

  /*
   * L'aiguillage des onglets se fait sur la VUE, pas sur la route.
   *
   * C'est ce qui permet à `#/nutrition` d'ouvrir le plan au gramme près sous
   * POWER 12 et les principes sous MASS 4, sans changer d'adresse : c'est le
   * module du programme qui a dit, dans ses onglets, quel écran répond.
   */
  switch (onglet?.vue) {
    case 'progress':
      return <ProgressScreen key={dataVersion} />;

    case 'progress-volume':
      return <ProgressVolumeScreen key={dataVersion} programme={programme} />;

    case 'nutrition':
      /*
       * `todayKind` fait partie de la clé, pas seulement des props : l'écran
       * s'en sert pour choisir le palier affiché à l'ouverture, et cette
       * décision est prise une seule fois, au montage. Or au démarrage à froid
       * les réglages sont encore en train d'être lus, donc `todayKind` vaut
       * « repos » pendant un instant — sans cette clé, un lundi s'ouvrait sur
       * la journée de repos et y restait.
       */
      return (
        <NutritionScreen
          key={`${dataVersion}-${todayKind}`}
          todayKind={todayKind}
          kindProgramme={kindProgramme}
          todayDay={todayDay}
          todayWeek={todayWeek}
          onDayKindChange={refresh}
        />
      );

    case 'nutrition-principes':
      return <NutritionPrincipesScreen key={dataVersion} todayKind={todayKind} />;

    case 'combine':
      return <CombineScreen key={dataVersion} />;

    case 'mesures':
      return <MesuresScreen key={dataVersion} />;

    case 'settings':
      return <SettingsScreen key={dataVersion} onChanged={refresh} programme={programme} />;

    default:
      return today;
  }
}
