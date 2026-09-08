# Programme 12 semaines

Application web installable (PWA) pour suivre le programme de préparation
physique décrit dans [`programme-final-12-semaines.md`](programme-final-12-semaines.md).

Fonctionne à 100 % hors ligne après la première ouverture. Toutes les données
restent sur l'appareil : pas de compte, pas de serveur, pas de base distante.

## Le principe

Le fichier `.md` est la **source de vérité**. Le code ne le réinterprète pas :

- `src/data/` transcrit le programme, et rien d'autre — aucune logique.
- `src/engine/` contient les fonctions pures qui décident (séance du jour,
  progression, feu tricolore). Aucun React.
- `src/db/` stocke ce qui a réellement été fait.
- `src/screens/` et `src/components/` affichent.

Les tests de `src/data/mainLiftTable.test.ts` **relisent le fichier `.md`** et
comparent le tableau de la section 9 case par case. Si le programme change, ou
si la transcription dérive, le déploiement échoue.

## Développement

```bash
npm install
npm run dev        # serveur local
npm test           # 263 tests
npm run typecheck
npm run build      # génère dist/ avec le service worker
```

Régénérer les icônes après un changement de couleur :

```bash
node scripts/generate-icons.mjs
```

## Déploiement

Un push sur `main` déclenche [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) :
tests, vérification des types, build, publication sur GitHub Pages. Le `base`
de Vite est déduit du nom du dépôt, donc renommer le dépôt ne casse rien.

## Polices

Barlow Condensed (500 et 700) est embarqué dans `src/assets/fonts/`, jamais
chargé depuis internet : sans réseau dans la salle, la mise en page ne doit pas
changer. Licence SIL Open Font License 1.1, voir `src/assets/fonts/OFL.txt`.

## Limite connue — chrono et verrouillage d'écran

iOS suspend le JavaScript d'une page en arrière-plan et n'offre aucune API de
notification programmée dans le futur. Une alerte sonore à l'instant exact où
le repos se termine, écran verrouillé, n'est donc pas réalisable depuis une
application web sur iPhone.

Deux parades sont en place :

1. **Screen Wake Lock** — l'écran est maintenu allumé pendant le repos. La
   barre de chrono affiche « écran allumé » ou « écran non tenu » pour que ce
   soit vérifiable d'un coup d'œil, en salle.
2. **Horodatage de fin** — le chrono ne décompte pas, il compare à une heure de
   fin stockée. Même si l'appli est tuée puis relancée, le temps affiché au
   retour est juste.
