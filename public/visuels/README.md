# Visuels — pack NFL Classic Premium V1

Sept visuels, chacun en deux tailles. Le navigateur n'en télécharge **qu'une**
par emplacement, choisie par `srcSet` et `sizes` (voir `src/data/visuels.ts`).

| Fichier | Dimensions | Poids | Où |
|---|---|---|---|
| `02_stade` | 1200×600 / 640×320 | 114 / 32 Ko | Aujourd'hui (repos, avant le départ), Combine |
| `04_montage_athlete` | 1097×1200 / 585×640 | 188 / 67 Ko | Aujourd'hui (programme terminé) |
| `05_sprint` | 1200×675 / 640×360 | 61 / 26 Ko | Aujourd'hui (puissance, taper) |
| `06_developpe_couche` | 1200×675 / 640×360 | 65 / 29 Ko | Aujourd'hui (accumulation, deload) |
| `07_reception` | 801×1200 / 427×640 | 80 / 30 Ko | Aujourd'hui (combine) |
| `athlete-squat` | 1086×1448 / 640×853 | 117 / 59 Ko | Aujourd'hui (force maximale) |
| `30_mass_athlete` | 885×441 / 640×319 | 21 / 13 Ko | MASS — Aujourd'hui |
| `31_mass_disque` | 885×443 / 640×320 | 24 / 15 Ko | MASS — Semaine |
| `32_mass_salle` | 885×443 / 640×320 | 17 / 11 Ko | MASS — Séance |
| `33_mass_disques` | 885×443 / 640×320 | 22 / 13 Ko | MASS — Combiné |
| `34_mass_nutrition` | 1200×401 / 640×214 | 40 / 14 Ko | MASS — Nutrition |
| `35_mass_reglages` | 1200×400 / 640×213 | 36 / 12 Ko | MASS — Réglages |
| `36_mass_mesures` | 1200×400 / 640×213 | 39 / 13 Ko | MASS — Mesures |
| `37_mass_progres` | 1200×401 / 640×214 | 36 / 13 Ko | MASS — Progrès |
| `40_power_nutrition` | 1200×400 / 640×213 | 48 / 17 Ko | POWER — Nutrition |
| `41_power_combine` | 1200×400 / 640×213 | 35 / 14 Ko | POWER — Combine |
| `42_power_semaine` | 1200×400 / 640×213 | 35 / 14 Ko | POWER — Semaine |

## Poids réel

1,2 Mo pour les seize fichiers, mais **un seul écran n'en charge qu'un**,
entre 61 et 188 Ko. Ils sont volontairement HORS du pré-cache de la PWA :
l'installation reste à 678 Ko. Une règle d'exécution (`CacheFirst`, voir
`vite.config.ts`) les garde après leur première ouverture en ligne.

Si un fichier manque, l'écran reste complet : `visuels.ts` renvoie `null` et
le composant `Visuel` n'affiche rien. Pas de cadre vide, pas de 404.

## Marques tierces — ce qui a été retiré

Le pack livré en contenait quatre, visibles :

| Image | Marque | Traitement |
|---|---|---|
| `04_montage_athlete` | logo Under Armour sur la cuisse | tampon de clonage |
| `04_montage_athlete` | lettrage Under Armour sur la ceinture | fondu local |
| `05_sprint` | virgule Nike sur la chaussure | tampon de clonage |
| `06_developpe_couche` | virgule Nike sur le maillot | tampon de clonage |
| `07_reception` | virgule Nike sur le short | tampon de clonage |
| `athlete-squat` | virgule Nike sur la chaussure droite | tampon de clonage |
| `athlete-squat` | marques sur les deux talonnières | tampon de clonage |

Elles ont été effacées **des fichiers**, pas masquées par un cadrage : un
recadrage CSS laisse la marque dans les octets servis, ce qui ne vaut rien
pour une appli destinée à la vente. Les variantes `_mobile` ont été
ré-encodées depuis les fichiers retouchés, pas reprises du pack.

Aucun logo NFL, aucun nom d'équipe, aucun emblème officiel.

## Ce qui n'est PAS réglé

Ces images sont des générations d'IA, et le guide du pack le dit lui-même :
« Ce pack ne constitue pas une garantie de droits commerciaux. » Avoir effacé
les marques ne crée aucun droit. Avant toute commercialisation il faut soit
des photographies sous licence commerciale explicite, soit des prises de vue
faites pour l'occasion.

## `athlete-squat` — cadrage

Le seul visuel en portrait franc (1086 × 1448) servi dans un en-tête presque
carré : on n'en voit qu'environ deux tiers. `focus: center 12%` fait descendre
la fenêtre du haut du crâne jusque sous les genoux. Vérifié à 390, 430, 560 et
768 px : le visage et la barre restent entiers partout. Centré, le cadrage
coupait le haut de la tête à 430 px.

Les bandes rouges incrustées en bas de l'image d'origine tombent hors de la
fenêtre à ce cadrage — elles n'entrent donc pas en concurrence avec les bandes
diagonales du composant `Decor`.

## Pour remplacer un visuel

1. déposer les deux tailles dans ce dossier
2. corriger son entrée dans `src/data/visuels.ts` (nom, largeurs, `focus`)

`focus` est le point d'intérêt (`object-position`) : c'est lui qui décide de
ce qu'on garde quand un bandeau de 390 × 200 recadre une image de 1200 × 675.

## Les quatre photos MASS

Fournies par Guillaume le 14 novembre, en une planche de 1774 × 887 découpée
en quatre. Chacune fait 885 px de large : elles ne sont **pas agrandies** à
1200, ce qui n'ajouterait que du flou. Même réserve de droits que le pack
POWER : ce sont vraisemblablement des générations d'IA. Aucune marque visible.

## Les bandeaux du 14 novembre

Sept bandeaux fournis par Guillaume, en 3:1 (2172 × 724), ramenés à 1200 et
640 px sans autre retouche — sauf `41_power_combine` : le logo de la
chaussure droite de l'athlète a été effacé du fichier (1 682 pixels), comme
sur les autres photos POWER. Ils remplacent `01_ballon` (Nutrition de POWER)
et `03_casque` (Semaine de POWER), supprimés parce que plus rien ne les
utilisait. `02_stade` reste : il sert encore à l'écran Aujourd'hui.
