# Dcross-fit — notes pour Claude Code

Application web installable (PWA) de préparation physique. Hors ligne à 100 %,
aucune donnée ne quitte l'appareil : pas de compte, pas de serveur.

Interlocuteur : **Guillaume**, 34 ans, père de famille, peu de temps, débutant
en IA. **Réponds toujours en français.**

---

## La règle qui prime sur toutes les autres

**Le fichier `.md` est la source de vérité. Le code le transcrit, il ne le
réinterprète pas.**

- `programme-final-12-semaines.md` — le programme POWER 12, section par section
  (§3 semaine type, §8 modifications par bloc, §11 règles de progression,
  §13 objectifs). Il n'y a plus de §14 : le suivi de l'adducteur gauche a
  été retiré, voir plus bas.
- `plan-alimentaire-12-semaines.md` — le plan alimentaire personnel de
  Guillaume.

Des tests **relisent ces `.md`** et comparent case par case (`mainLiftTable.test.ts`,
`program.test.ts`). Si le code et le `.md` divergent, le déploiement échoue.
Quand tu changes une prescription, change les deux.

---

## Architecture

| Dossier | Rôle | Interdit |
|---|---|---|
| `src/data/` | Transcription du `.md` : exercices, séances, règles de bloc | Aucune logique |
| `src/engine/` | Fonctions **pures** : séance du jour, progression, feu tricolore | Aucun React |
| `src/db/` | Dexie/IndexedDB — ce qui a été réellement fait | — |
| `src/screens/`, `src/components/` | Affichage (CSS Modules) | — |

Routage par hash : `#/session/{semaine}/{jour}`, `#/settings`, `#/nutrition`,
`#/combine`. Les jours sont indexés 0 = lundi, 2 = mercredi, 4 = vendredi,
5 = samedi, 6 = dimanche.

---

## Commandes

```bash
npm install          # conteneur neuf : vitest n'existe pas sans ça
npm test             # suite complète
npm run typecheck
npm run build
npm run empreinte    # régénère l'empreinte (voir plus bas)
```

Formatage : `npx prettier --write <fichiers touchés>`. **Jamais sur tout le
dépôt.**

---

## L'empreinte, et son angle mort

`src/engine/__fixtures__/empreinte.txt` fige les douze semaines, séance par
séance, exercice par exercice. Toute modification du programme la fait tomber.

Après l'avoir régénérée, **lis le diff et vérifie qu'il ne contient que ce que
tu voulais changer.** C'est le meilleur garde-fou du dépôt.

**Ce qu'elle ne voit pas :** elle compare les séries, le travail, la charge, le
repos et le RPE — **pas les notes de prescription**. Une progression qui passe
par la consigne lui est invisible : on peut vider les consignes et l'empreinte
reste verte (vérifié). Si tu touches à des consignes, écris un test dédié
(modèle : `src/engine/progressionTronc.test.ts`).

---

## Discipline de vérification

Trois obligations avant d'annoncer qu'une chose marche :

1. **Prouve un garde-fou en le cassant.** Casse délibérément la décision que tu
   viens de prendre, vérifie que le test tombe, restaure. Un test qu'on n'a pas
   vu échouer ne protège rien.
2. **Regarde l'app.** Playwright est préinstallé :
   `/opt/node22/lib/node_modules/playwright/index.mjs`, binaire
   `/opt/pw-browsers/chromium`, option `--no-sandbox`. Viewport 402 × 874,
   `deviceScaleFactor: 2`. L'écran Réglages exige un cycle actif : semer avec
   `demarrerCycle` depuis `src/db/repo.ts`.
3. **Dis les chiffres.** Durée de séance, nombre de tests, taille du diff. Pas
   « ça marche ».

---

## Travailler avec Guillaume

- **Ne déploie jamais sans son « déploie » explicite.** Commit et push sur la
  branche, puis attends. Cette règle n'a pas d'exception.
- **Une seule recommandation, tranchée.** Pas de liste d'options sans
  conclusion. Son avis se corrige, pas son temps.
- **Sois honnête, surtout quand ça contrarie la demande.** Les meilleures
  décisions de ce dépôt sont nées d'un « voilà pourquoi c'est une mauvaise
  idée » chiffré. Donne le coût réel (minutes de séance, tests cassés) avant
  de coder.
- **Termine par UNE action concrète.**
- Niveau d'effort : jamais en dessous de `medium` pour la base de données ou un
  calcul sportif.

### Déploiement

Commit → push → `create_pull_request` → attendre `validate-pr.yml` →
`merge_pull_request` en **squash** avec le SHA complet (40 caractères) →
vérifier `deploy.yml`.

**Piège connu :** le merge en squash réécrit l'historique côté `main`. La PR
suivante sur la même branche arrive en conflit (`mergeable_state: dirty`). Le
force-push est bloqué par le classifieur — **fusionne `origin/main` dans la
branche** plutôt que de la réécrire, puis vérifie que
`git diff --stat origin/main..HEAD` ne contient que le travail nouveau.

---

## Le catalogue, et la famille FEMMES

`src/data/catalogue.ts` décrit les familles et leur **état réel**.

Un programme n'est `disponible` que s'il est **réellement jouable de bout en
bout**. Tout le reste est `a-venir`, et un programme `a-venir` ne se démarre
pas : le bouton n'existe pas, il n'est pas seulement grisé.

| Famille | État |
|---|---|
| POWER | Disponible — c'est le programme de ce dépôt |
| MASS | Conçu, tourne dans sa propre application, **pas encore intégré ici** |
| FEMMES | `programmes: []` — la place est prête, le contenu non |
| PERSO | Programme apporté par quelqu'un d'autre |

**La place de FEMMES est déjà faite** : l'identifiant existe, l'entrée du
catalogue existe, le bloc de thème `[data-theme='femmes']` existe dans
`src/styles/tokens.css`. Ce qui manque, c'est le contenu sportif et l'identité
visuelle.

**N'invente ni l'un ni l'autre.** Pas d'objectifs, pas d'exercices, pas de
durées. Ces règles viennent de Guillaume ; le code les cite comme « §4 » (ne
rien inventer) et « §15 » (identité visuelle à définir plus tard).

**L'identité visuelle, elle, est désormais POSÉE** — le §15 est honoré.
Guillaume a fourni des maquettes, et `[data-theme='femmes']` les transcrit :
registre synthwave, nuit violette (`--bg: #160a26`), néon magenta. Ce n'est
pas le « rose par défaut » que la règle refusait, c'est un parti pris fourni.

Un point à ne pas « corriger » : `--accent` vaut `#d1006e` et non le `#ff2d95`
des maquettes. Le fluo ne porte que **3,46:1** sous du texte blanc, sous le
seuil de 4,5 ; `#d1006e` remonte à **5,34**. Le néon n'est pas perdu, il vit
dans `--accent-bright` pour les lueurs et les bordures, jamais sous du petit
texte. Les contrastes du bloc ont tous été mesurés et sont écrits en commentaire.

### Décision prise : le programme FEMMES sera GÉNÉRIQUE

Pas calibré sur une personne. Plusieurs pratiquantes doivent pouvoir le suivre.

**Ce qui est déjà générique, et qu'il ne faut surtout pas réécrire :**

- Les charges des lifts principaux sont des **pourcentages du 1RM**
  (`pct(82, 'back-squat', 95)` dans `mainLiftTable.ts`). Le troisième argument,
  `kgOrigine`, n'est qu'une référence historique affichée : c'est le `%` qui
  calcule la charge, à partir du 1RM saisi par la pratiquante.
- Le **combine initial** (semaine 0) mesure ces 1RM : squat, bench, deadlift,
  tractions. Le moteur en dérive tout le tableau.

Autrement dit : une femme qui démarre à 40 kg de squat reçoit déjà les bonnes
charges, sans qu'une ligne de code change.

**Ce qui était personnel à Guillaume et EST SORTI :** le §14 (adducteur
gauche). Plus de champ `painWatch`, plus d'écran de suivi de douleur, plus
aucune consigne qui nomme sa blessure. Décision de Guillaume : « disparaît »,
pas de mécanisme de blessure déclarée. La table `painLog` reste en base et
dans l'export : on ne supprime pas des données saisies. Les décisions de
programme qu'elle avait motivées (Zercher March déprogrammé, Copenhagen au
vendredi en levier court) sont **gardées telles quelles**. Des tests
(`coreCycle.test.ts`, `program.test.ts`) empêchent tout retour.

**Ce qui reste strictement personnel à Guillaume, et doit sortir :**

1. **Les rampes d'échauffement du combine** (`RAMP_SQUAT` et consorts) portent
   des kilos absolus (« 147,5 seulement si 142,5 passe proprement »). À dériver
   du 1RM estimé, ou à redemander à chaque combine.
2. **Le plan alimentaire** (`plan-alimentaire-12-semaines.md`) est le sien.
3. **Les objectifs du §13**, calculés sur ses 1RM à lui.

**L'avertissement, corrigé.** Une première version de ces notes affirmait que
« programme femme » n'est pas une catégorie physiologique. **C'est faux dans le
cas qui nous occupe**, et la correction compte : le programme retenu pour le
cycle 1 est un programme POST-PARTUM. Le diastasis des grands droits et la
rééducation périnéale sont des réalités physiologiques précises, qui
interdisent des exercices nommés et en imposent d'autres. Ce n'est pas du
marketing, c'est de la sécurité.

Ce qui reste vrai : un programme ne se justifie pas par le sexe seul. Il se
justifie par sa **structure** — ici, des circuits en tours, du matériel léger à
domicile, un questionnaire de sécurité bloquant et des substitutions
automatiques. Rien de tout cela n'existe dans POWER 12, et c'est bien pour ça
que le programme a lieu d'être.

Demande à Guillaume le niveau visé, l'objectif, les jours disponibles, le
matériel et la durée avant d'écrire la moindre séance.

---

## Ce qui est volontaire et n'est pas à « corriger »

- Pas de comptes utilisateurs — tout est local, par choix.
- Le Zercher March est **déprogrammé mais conservé au catalogue** : « on ne
  supprime pas d'exercices existants ».
- Le Bear Crawl est **déprogrammé dès la semaine 1 mais conservé au catalogue**,
  pour la même raison. Le tronc du dimanche tient en deux exercices sur les
  douze semaines.
- Le samedi porte deux exercices de « flexion latérale » (Suitcase Carry +
  Roman Side Bench). C'est l'**unique dérogation** à la règle « jamais deux
  exercices du tronc de la même famille le même jour », écrite comme une paire
  nommée et assumée par Guillaume.
- Le chrono de sprint est un **indicateur de transfert**, pas un objectif :
  aucune séance ne fait sprinter.
- Le programme ne propose **aucune quantité alimentaire** : il additionne et
  affiche l'écart. Proposer un gramme serait une prescription.
- **FEMMES 8, phase 2 : la confirmée rejoint l'intermédiaire, et c'est voulu.**
  La grille donne 4 tours fixes à la confirmée tandis que l'intermédiaire y
  monte de 3 à 4 : en semaine 5 les deux séances sont identiques. Le
  comportement a été montré à Guillaume avec son correctif (5 tours, comme la
  phase 3) ; il a tranché pour 4. La phase 2 est une construction commune,
  c'est la phase 3 qui sépare les niveaux — 3, 4 et 5 tours. Un test de
  `niveaux.test.ts` fige cette décision : s'il tombe, c'est qu'un chiffre a
  bougé par mégarde, pas qu'il faut « réparer » la grille.
