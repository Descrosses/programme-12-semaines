# Questionnaire « Bilan sportif et nutrition » — source figée

Copie exacte, au 23 novembre 2026, du script de la page de Guillaume
<https://questionnaire-bilan-sportif.netlify.app> :

- `bilan.js` — le `<script>` de la page, recopié tel quel (sections,
  questions, conditions, vigilance, arrêt de sécurité, bases candidates,
  résumé envoyé).

Ce fichier fait foi pour le bilan intégré à l'appli
(`src/data/questionnaireBilanSportif.ts`, `src/engine/questionnaireBilanSportif.ts`).
Le test `src/engine/questionnaireBilanSportif.test.ts` l'**exécute** et
compare sections, conditions, vigilance, arrêt et résumé à ceux de l'appli.

Si le site change : recopier le script, lancer `npm test`, et reprendre dans
l'appli exactement ce que le test signale. Ne jamais « corriger » cette copie
à la main.
