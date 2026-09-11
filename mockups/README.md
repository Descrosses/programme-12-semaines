# Maquettes de référence

Maquettes statiques dessinées avec Guillaume avant l'écriture de l'onglet
Nutrition. Elles fixent la **structure d'écran visée**, pas le code : les
couleurs, les polices et les composants réels viennent de `src/styles/tokens.css`
et des composants existants.

- `mockup-nutrition.html` — première passe.
- `apercu-nutrition-v2.html` — version retenue : sélecteur entraînement/repos
  qui change réellement les repas et le total, suivi de poids, moyenne 7 jours.
- `apercu-semaine-avec-lien-nutrition.html` — style de la carte de raccourci.
  Elle a finalement été posée sur l'écran **Aujourd'hui** et non sur Semaine :
  une semaine mélange des jours d'entraînement et des jours de repos, donc une
  carte unique y afficherait une cible fausse pour au moins un jour.

Ces fichiers ne sont pas construits ni servis : ils ne sont là que pour
comparer le rendu réel à l'intention.
