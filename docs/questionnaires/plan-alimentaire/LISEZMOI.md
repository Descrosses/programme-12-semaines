# Questionnaire « Votre plan alimentaire » — source figée

Copies exactes, au 23 novembre 2026, du site de Guillaume
<https://plan-alimentaire-p.netlify.app> :

- `app.js` — le script de la page (questions, conditions, résumé envoyé) ;
- `foods.js` — les 43 aliments et leurs 5 catégories.

Ces deux fichiers font foi pour le questionnaire intégré à l'appli
(`src/data/questionnairePlanAlimentaire.ts`). Le test
`src/engine/questionnairePlanAlimentaire.test.ts` les **exécute** et compare
libellés, erreurs et résumé à ceux de l'appli.

Si le site change : recopier ces deux fichiers, lancer `npm test`, et
reprendre dans l'appli exactement ce que le test signale. Ne jamais
« corriger » ces copies à la main.
