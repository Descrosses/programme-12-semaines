
"use strict";
/* ==========================================================================
   Étape « Quels aliments aimez-vous ? »
   - BASE ALIMENTS  : foods.js (valeurs /100 g, catégories, tags)
   - SÉLECTION      : state.selected = liste d'identifiants UNIQUES d'aliments
                      (un aliment multi-catégories n'est stocké qu'une fois)
   - PLUS TARD      : menus, quantités, macros (non développé ici)
   ========================================================================== */

const FOOD_BY_ID = Object.fromEntries(FOODS.map(f => [f.id, f]));

/* Accès pour le futur générateur de menus.
   byCategory inclut les catégories secondaires (saumon sort aussi dans « lipides »). */
const FoodLibrary = {
  byId: id => FOOD_BY_ID[id] || state.customFoods.find(f => f.id === id) || null,
  all: () => FOODS.concat(state.customFoods),
  byCategory(cat, withAdditional = true){
    return FoodLibrary.all().filter(f => f.category === cat || (withAdditional && (f.additionalCategories || []).includes(cat)));
  },
  selected: () => state.selected.map(FoodLibrary.byId).filter(Boolean),
  selectedWithTag: tag => FoodLibrary.selected().filter(f => (f.tags || []).includes(tag))
};

/* Moteur nutritionnel : inchangé dans son principe, en attente de l'étape suivante.
   valeur portion = valeur /100 g × quantité / 100 */
const Nutrition = {
  zero(){ return { kcal:0, protein:0, carbs:0, fat:0 }; },
  add(a, b){ return { kcal:a.kcal+b.kcal, protein:a.protein+b.protein, carbs:a.carbs+b.carbs, fat:a.fat+b.fat }; },
  per100(food){ return { kcal:food.kcal, protein:food.protein, carbs:food.carbs, fat:food.fat }; },
  portion(food, quantity){
    const k = quantity / 100;
    return { kcal:food.kcal*k, protein:food.protein*k, carbs:food.carbs*k, fat:food.fat*k };
  }
};

/* Contrôles de données : visibles dans la console du navigateur seulement. */
function checkData(){
  const ids = new Set(), cats = FOOD_CATEGORIES.map(c => c.id);
  FOODS.forEach(f => {
    if (ids.has(f.id)) console.error(`Aliment en double : ${f.id}`); ids.add(f.id);
    if (!cats.includes(f.category)) console.error(`${f.name} : catégorie inconnue.`);
    (f.additionalCategories || []).forEach(c => { if (!cats.includes(c) || c === f.category) console.error(`${f.name} : catégorie secondaire invalide « ${c} ».`); });
    if (!f.nutritionBasis || !["cuit","cru","produit","comestible"].includes(f.referenceState)) console.error(`${f.name} : référence nutritionnelle manquante.`);
    const est = 4*f.protein + 4*f.carbs + 9*f.fat;
    if (Math.abs(f.kcal - est) > Math.max(12, 0.15 * f.kcal)) console.warn(`${f.name} : kcal (${f.kcal}) éloignées des macros (${Math.round(est)}).`);
  });
}

/* ---- Utilitaires ---- */
const norm = t => String(t).toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const cap = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
const fmt = (n, d=1) => n.toLocaleString("fr-FR", { minimumFractionDigits:0, maximumFractionDigits:d });
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs || {})){
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  kids.flat().forEach(c => { if (c == null || c === false) return; el.append(c.nodeType ? c : document.createTextNode(c)); });
  return el;
}

/* ==========================================================================
   État + sauvegarde locale (même système que les étapes précédentes)
   step : "intro" | "p0".."p3" (profil) | 0..4 (catégories) | "recap" | "done"
   ========================================================================== */
/* Profil : toute valeur non renseignée reste vide ("" ou null), jamais 0.
   Les nombres sont gardés tels que saisis (texte) et lus seulement au résumé. */
const PROFILE_KEYS = ["sex","age","height","weight","waist","job","steps","sessions","duration","sportType","goal","pace","trend","weight4w","pregnant","medical","eating","allergies"];
function emptyProfile(){
  const p = {}; PROFILE_KEYS.forEach(k => p[k] = k === "sportType" ? [] : (["age","height","weight","waist","weight4w","allergies"].includes(k) ? "" : null)); return p;
}
const PROFILE_STEPS = ["p0","p1","p2","p3"];
const PROFILE_TITLES = { p0:"Vous", p1:"Votre activité", p2:"Votre objectif", p3:"Sécurité" };
const STEPS = () => PROFILE_STEPS.concat(FOOD_CATEGORIES.map((c, i) => i));

const state = { step:"intro", selected:[], customFoods:[], profile:emptyProfile() };
const STORE_KEY = "preferences-repas.v2";
let addOpen = false;
let errors = {};
function save(){ try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch(e){} }
function load(){
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (!s) return;
    const cats = FOOD_CATEGORIES.map(c => c.id);
    state.customFoods = (Array.isArray(s.customFoods) ? s.customFoods : [])
      .filter(f => f && f.id && f.name && cats.includes(f.category)).map(f => Object.assign({}, f, { custom:true }));
    state.selected = [...new Set(Array.isArray(s.selected) ? s.selected : [])].filter(id => FoodLibrary.byId(id));
    if (s.profile && typeof s.profile === "object") PROFILE_KEYS.forEach(k => {
      const v = s.profile[k];
      if (k === "sportType") { if (Array.isArray(v)) state.profile[k] = v.filter(x => typeof x === "string"); }
      else if (typeof v === "string") state.profile[k] = v;
    });
    if (["intro","recap","done"].concat(PROFILE_STEPS).includes(s.step) || (Number.isInteger(s.step) && s.step >= 0 && s.step < FOOD_CATEGORIES.length)) state.step = s.step;
  } catch(e){}
}
const isOn = id => state.selected.includes(id);
const primaryFoods = cat => FoodLibrary.all().filter(f => f.category === cat);
const countIn = cat => primaryFoods(cat).filter(f => isOn(f.id)).length;

/* ==========================================================================
   Actions
   ========================================================================== */
function go(step){ state.step = step; addOpen = false; errors = {}; save(); render(); window.scrollTo(0, 0); }
function toggle(id){
  const i = state.selected.indexOf(id);
  if (i >= 0) {
    state.selected.splice(i, 1);
    const f = FoodLibrary.byId(id);
    if (f && f.custom) state.customFoods = state.customFoods.filter(x => x.id !== id);
  } else state.selected.push(id);
  save(); render();
}
function selectAll(cat){
  primaryFoods(cat).forEach(f => { if (!isOn(f.id)) state.selected.push(f.id); });
  save(); render();
}
function resetCat(cat){
  const ids = primaryFoods(cat).map(f => f.id);
  state.selected = state.selected.filter(id => !ids.includes(id));
  state.customFoods = state.customFoods.filter(f => f.category !== cat);
  save(); render();
}
function addCustom(cat, raw){
  const name = raw.trim(); if (!name) return;
  const known = FOODS.find(f => norm(f.name) === norm(name));           // déjà dans la bibliothèque : on le sélectionne, sans doublon
  const dup = state.customFoods.find(f => norm(f.name) === norm(name));
  const food = known || dup;
  if (food) { if (!isOn(food.id)) state.selected.push(food.id); }
  else {
    /* Aucune valeur nutritionnelle inventée : elles restent vides jusqu'à saisie réelle. */
    const f = { id:"perso-" + Date.now().toString(36), name:cap(name), category:cat, additionalCategories:[], kcal:null, protein:null, carbs:null, fat:null,
      nutritionBasis:null, referenceState:null, tags:[], image:null, custom:true, verified:false };
    state.customFoods.push(f); state.selected.push(f.id);
  }
  addOpen = false; save(); render();
}
function restart(){
  if (!window.confirm("Effacer toutes vos sélections et recommencer ?")) return;
  state.selected = []; state.customFoods = []; state.profile = emptyProfile(); go("intro");
}

/* ==========================================================================
   Écrans
   ========================================================================== */
function renderBar(){
  const bar = document.getElementById("bar"), n = state.selected.length;
  const all = STEPS(), idx = all.indexOf(state.step), inSteps = idx >= 0;
  bar.hidden = !(inSteps || state.step === "recap");
  if (bar.hidden) return;
  const isFood = typeof state.step === "number";
  const name = !inSteps ? "Récapitulatif" : isFood ? FOOD_CATEGORIES[state.step].label : PROFILE_TITLES[state.step];
  document.getElementById("stepLabel").replaceChildren(inSteps ? `Étape ${idx + 1}/${all.length} · ${name}` : name);
  document.getElementById("countLabel").replaceChildren(...(isFood || !inSteps ? [h("b", {}, String(n)), n > 1 ? " aliments" : " aliment"] : []));
  document.getElementById("fill").style.width = (inSteps ? (idx + 1) / all.length * 100 : 100) + "%";
}

function renderIntro(){
  return h("div", {},
    h("h1", {}, "Votre plan alimentaire"),
    h("p", { class:"lead" }, "D'abord quelques questions sur vous et votre activité (environ 2 minutes). Elles servent à estimer vos besoins."),
    h("p", { class:"lead" }, "Ensuite, sélectionnez les aliments que vous aimez manger. Nous utiliserons uniquement ces aliments pour construire vos futurs menus."),
    h("div", { class:"nav" }, h("button", { class:"primary", onclick:() => go("p0") }, "Commencer")));
}

/* ==========================================================================
   Écrans profil : données pour estimer les besoins (calcul fait plus tard, hors du site)
   ========================================================================== */
const P = () => state.profile;
const num = v => { const x = parseFloat(String(v).replace(",", ".").trim()); return Number.isFinite(x) ? x : null; };
const isFemale = () => P().sex === "femme";
const doesSport = () => P().sessions != null && P().sessions !== "0";

const OPTS = {
  sex:[["femme","Femme"],["homme","Homme"]],
  job:[["assis","Assis la plupart du temps"],["debout","Debout, peu de port de charges"],["physique","Physique (port de charges, déplacements)"]],
  steps:[["<5000","Moins de 5 000"],["5000-8000","5 000 à 8 000"],["8000-12000","8 000 à 12 000"],[">12000","Plus de 12 000"],["nsp","Je ne sais pas"]],
  sessions:[["0","0"],["1","1"],["2","2"],["3","3"],["4","4"],["5","5"],["6+","6 ou plus"]],
  duration:[["<45","Moins de 45 min"],["45-75","45 à 75 min"],[">75","Plus de 75 min"]],
  sportType:[["muscu","Musculation"],["cardio","Cardio (course, vélo…)"],["collectif","Sport collectif"],["autre","Autre"]],
  goal:[["perte","Perdre du poids"],["maintien","Maintenir mon poids"],["prise","Prendre du poids (muscle)"]],
  pace:[["progressif","Progressif"],["modere","Modéré"],["rapide","Le plus vite possible"]],
  trend:[["stable","Stable"],["baisse","En baisse"],["hausse","En hausse"],["nsp","Je ne sais pas"]],
  pregnant:[["non","Non"],["oui","Oui"]],
  medical:[["non","Non"],["oui","Oui"]],
  eating:[["non","Non"],["oui","Oui"],["oral","Je préfère en parler de vive voix"]]
};
/* Bornes de saisie : détection de fautes de frappe seulement, pas des critères de santé. */
const NUMS = {
  age:{ label:"Âge", unit:"ans", min:18, max:99, int:true },
  height:{ label:"Taille", unit:"cm", min:130, max:220, int:true },
  weight:{ label:"Poids", unit:"kg", min:35, max:250 },
  waist:{ label:"Tour de taille", unit:"cm", min:50, max:180 },
  weight4w:{ label:"Poids il y a environ 4 semaines", unit:"kg", min:35, max:250 }
};
const label = (key, v) => { const o = (OPTS[key] || []).find(x => x[0] === v); return o ? o[1] : v; };

function fieldWrap(key, title, optional, hint, control){
  return h("div", { class:"field" + (errors[key] ? " bad" : ""), id:"f-" + key },
    h("span", { class:"lbl", id:"l-" + key }, title, optional ? h("span", { class:"opt" }, " (facultatif)") : null),
    hint ? h("span", { class:"hint" }, hint) : null,
    control,
    errors[key] ? h("p", { class:"err", role:"alert" }, errors[key]) : null);
}
function numField(key, opts = {}){
  const d = NUMS[key];
  const inp = h("input", { class:"num", type:"text", inputmode:d.int ? "numeric" : "decimal", autocomplete:"off", maxlength:"6", "aria-labelledby":"l-" + key, value:P()[key] || "" });
  inp.addEventListener("input", () => { P()[key] = inp.value.trim(); save(); });
  return fieldWrap(key, d.label, opts.optional, opts.hint, h("div", { class:"inrow" }, inp, h("span", { class:"unit" }, d.unit)));
}
function choiceField(key, title, opts = {}){
  const multi = opts.multi, cur = P()[key];
  const chips = OPTS[key].map(([v, l]) => {
    const on = multi ? cur.includes(v) : cur === v;
    return h("button", { type:"button", class:"chip" + (on ? " on" : ""), "aria-pressed":String(on), onclick:() => {
      if (multi) P()[key] = on ? cur.filter(x => x !== v) : cur.concat(v);
      else P()[key] = on ? null : v;
      delete errors[key]; save(); render();
    } }, l);
  });
  return fieldWrap(key, title, opts.optional, opts.hint, h("div", { class:"chips", role:"group", "aria-labelledby":"l-" + key }, chips));
}
function textField(key, title, opts = {}){
  const inp = h("input", { class:"txt", type:"text", maxlength:"120", autocomplete:"off", "aria-labelledby":"l-" + key, placeholder:opts.placeholder || "", value:P()[key] || "" });
  inp.addEventListener("input", () => { P()[key] = inp.value; save(); });
  return fieldWrap(key, title, true, opts.hint, inp);
}

/* Champs obligatoires et conditionnels de chaque écran */
function requiredFor(step){
  const p = P();
  if (step === "p0") return { choice:["sex"], nums:["age","height","weight"], optNums:["waist"] };
  if (step === "p1") return { choice:["job","steps","sessions"].concat(doesSport() ? ["duration","sportType"] : []), nums:[], optNums:[] };
  if (step === "p2") return { choice:["goal"].concat(p.goal && p.goal !== "maintien" ? ["pace"] : []).concat(["trend"]), nums:[], optNums:["weight4w"] };
  return { choice:(isFemale() ? ["pregnant"] : []).concat(["medical","eating"]), nums:[], optNums:[] };
}
function validate(step){
  const r = requiredFor(step), p = P(); errors = {};
  r.choice.forEach(k => { const v = p[k]; if (Array.isArray(v) ? v.length === 0 : v == null) errors[k] = "Choisissez une réponse."; });
  r.nums.concat(r.optNums).forEach(k => {
    const raw = p[k], d = NUMS[k];
    if (!raw) { if (r.nums.includes(k)) errors[k] = "Indiquez une valeur."; return; }
    const x = num(raw);
    if (x == null) errors[k] = "Saisissez un nombre (ex. " + (d.int ? "175" : "72,5") + ").";
    else if (k === "age" && x < 18) errors[k] = "Ce questionnaire est réservé aux adultes (18 ans et plus).";
    else if (x < d.min || x > d.max) errors[k] = `Valeur à vérifier (entre ${d.min} et ${d.max} ${d.unit}).`;
  });
  return Object.keys(errors).length === 0;
}
function next(step, target){
  if (validate(step)) { go(target); return; }
  render();
  const first = document.querySelector(".field.bad");
  if (first) { first.scrollIntoView({ block:"center" }); const i = first.querySelector("input,button"); if (i) i.focus({ preventScroll:true }); }
}
const safetyFlag = () => P().pregnant === "oui" || P().medical === "oui" || P().eating === "oui" || P().eating === "oral";

function renderProfile(step){
  const i = PROFILE_STEPS.indexOf(step);
  const target = i === PROFILE_STEPS.length - 1 ? 0 : PROFILE_STEPS[i + 1];
  const back = i === 0 ? "intro" : PROFILE_STEPS[i - 1];
  let body, lead;
  if (step === "p0") {
    lead = "Ces informations servent uniquement à estimer votre dépense d'énergie.";
    body = [ choiceField("sex", "Sexe", { hint:"Utilisé seulement dans le calcul de la dépense au repos." }),
      numField("age"), numField("height"),
      numField("weight", { hint:"Idéalement la moyenne de 3 matins, à jeun, après être allé aux toilettes." }),
      numField("waist", { optional:true, hint:"Mesuré au niveau du nombril, sans serrer." }) ];
  } else if (step === "p1") {
    lead = "Votre activité de tous les jours compte autant que le sport.";
    body = [ choiceField("job", "Votre travail"),
      choiceField("steps", "Pas par jour en moyenne", { hint:"Si vous avez une montre ou un téléphone qui compte vos pas, regardez la moyenne de la semaine." }),
      choiceField("sessions", "Séances de sport par semaine"),
      doesSport() ? choiceField("duration", "Durée moyenne d'une séance") : null,
      doesSport() ? choiceField("sportType", "Type de sport", { multi:true, hint:"Plusieurs réponses possibles." }) : null ];
  } else if (step === "p2") {
    lead = "Le plus utile pour nous : savoir si votre poids bouge en ce moment.";
    body = [ choiceField("goal", "Votre objectif"),
      P().goal && P().goal !== "maintien" ? choiceField("pace", "À quel rythme ?") : null,
      choiceField("trend", "Votre poids des 4 dernières semaines"),
      numField("weight4w", { optional:true, hint:"Si vous le connaissez." }) ];
  } else {
    lead = "Quelques questions pour votre sécurité. Vos réponses restent entre vous et Guillaume.";
    body = [ isFemale() ? choiceField("pregnant", "Êtes-vous enceinte, allaitez-vous ou avez-vous accouché récemment ?") : null,
      choiceField("medical", "Avez-vous une maladie ou un traitement qui influence votre alimentation ?", { hint:"Par exemple diabète, thyroïde, maladie rénale ou digestive." }),
      choiceField("eating", "Avez-vous déjà eu une relation compliquée avec la nourriture ?", { hint:"Régimes très restrictifs, crises de perte de contrôle, troubles alimentaires." }),
      textField("allergies", "Allergies ou intolérances alimentaires", { placeholder:"Ex. lactose, arachide" }),
      safetyFlag() ? h("p", { class:"note" }, "Merci pour votre réponse. Guillaume en parlera avec vous avant toute proposition. Vous pouvez continuer le questionnaire.") : null ];
  }
  const n = Object.keys(errors).length;
  return h("div", {},
    h("h2", {}, PROFILE_TITLES[step]),
    h("p", { class:"lead" }, lead),
    h("div", { class:"sheet" }, body),
    n ? h("p", { class:"err" }, n > 1 ? `${n} réponses à compléter ou corriger.` : "Une réponse à compléter ou corriger.") : null,
    h("div", { class:"nav" },
      h("button", { class:"ghost", onclick:() => go(back) }, "Précédent"),
      h("button", { class:"primary", onclick:() => next(step, target) }, "Continuer")));
}

function foodCard(f){
  const on = isOn(f.id);
  const cats = (f.additionalCategories || []).map(c => FOOD_CATEGORIES.find(x => x.id === c)).filter(Boolean);
  let img = null;
  if (f.image) { img = h("img", { class:"fi", src:IMAGE_DIR + f.image, alt:"", loading:"lazy" }); img.addEventListener("error", () => img.remove()); }
  return h("button", { class:"food" + (on ? " on" : ""), type:"button", "aria-pressed":String(on), onclick:() => toggle(f.id) },
    img,
    h("span", { class:"top" }, h("span", { class:"nm" }, f.name), h("span", { class:"tick", "aria-hidden":"true" }, on ? "✓" : "")),
    f.kcal == null
      ? h("span", { class:"nov" }, "Valeurs à renseigner")
      : [ h("span", { class:"kc" }, fmt(f.kcal, 0), h("small", {}, "kcal")),
          h("span", { class:"mac" },
            h("span", {}, "P", h("b", {}, fmt(f.protein) + " g")),
            h("span", {}, "G", h("b", {}, fmt(f.carbs) + " g")),
            h("span", {}, "L", h("b", {}, fmt(f.fat) + " g"))),
          h("span", { class:"basis" }, "pour " + f.nutritionBasis) ],
    cats.length ? h("span", { class:"also" }, "+ " + cats.map(c => c.label.toLowerCase()).join(", ")) : null,
    on ? h("span", { class:"sr" }, "Sélectionné") : null);
}

function renderStep(i){
  const cat = FOOD_CATEGORIES[i], foods = primaryFoods(cat.id);
  const allOn = foods.every(f => isOn(f.id));
  const addBox = addOpen
    ? (() => {
        const inp = h("input", { type:"text", maxlength:"40", placeholder:"Nom de l'aliment", "aria-label":"Nom de l'aliment à ajouter", autocomplete:"off" });
        inp.addEventListener("keydown", e => { if (e.key === "Enter") addCustom(cat.id, inp.value); });
        setTimeout(() => inp.focus(), 0);
        return h("div", {}, h("div", { class:"addrow" }, inp, h("button", { class:"primary", style:"flex:none", onclick:() => addCustom(cat.id, inp.value) }, "Ajouter")),
          h("p", { class:"addnote" }, "Aucune valeur nutritionnelle n'est ajoutée automatiquement : elles seront à renseigner."));
      })()
    : h("button", { class:"addfood", onclick:() => { addOpen = true; render(); } }, "+ Ajouter un aliment");
  return h("div", {},
    h("h2", {}, cat.label),
    h("div", { class:"sheet" },
      h("span", { class:"hint" }, "Touchez les aliments que vous aimez. Valeurs moyennes pour 100 g, dans l'état indiqué (cuit, cru, produit)."),
      h("div", { class:"tools" },
        h("button", { class:"qa", onclick:() => allOn ? resetCat(cat.id) : selectAll(cat.id) }, allOn ? "Tout désélectionner" : "Tout sélectionner"),
        h("button", { class:"qa", onclick:() => resetCat(cat.id) }, "Réinitialiser")),
      h("div", { class:"foods" }, foods.map(foodCard)),
      h("div", { class:"addwrap" }, addBox)),
    h("div", { class:"nav" },
      h("button", { class:"ghost", onclick:() => go(i === 0 ? PROFILE_STEPS[PROFILE_STEPS.length - 1] : i - 1) }, "Précédent"),
      h("button", { class:"primary", onclick:() => go(i === FOOD_CATEGORIES.length - 1 ? "recap" : i + 1) }, i === FOOD_CATEGORIES.length - 1 ? "Voir le récapitulatif" : "Continuer")));
}

function renderRecap(){
  const secs = FOOD_CATEGORIES.map((cat, i) => {
    const list = primaryFoods(cat.id).filter(f => isOn(f.id));
    return h("section", { class:"rec" },
      h("div", { class:"rec-h" }, h("h3", {}, cat.label, h("span", { class:"c" }, list.length === 0 ? "aucun" : String(list.length))),
        h("button", { onclick:() => go(i), "aria-label":`Modifier : ${cat.label}` }, "Modifier")),
      list.length ? h("div", { class:"pills" }, list.map(f => h("span", { class:"pill" }, f.name))) : h("p", { class:"empty" }, "Aucun aliment sélectionné."));
  });
  const prof = h("section", { class:"rec" },
    h("div", { class:"rec-h" }, h("h3", {}, "Votre profil"),
      h("button", { onclick:() => go("p0"), "aria-label":"Modifier : votre profil" }, "Modifier")),
    h("div", { class:"pills" }, profileLines().slice(0, 6).map(([k, v]) => h("span", { class:"pill" }, v))));
  return h("div", {},
    h("h2", {}, "Récapitulatif"),
    h("p", { class:"lead" }, "Vérifiez vos réponses. Vous pouvez les modifier à tout moment."),
    h("div", { class:"sheet" }, prof, secs),
    h("div", { class:"nav" },
      h("button", { class:"ghost", onclick:() => go(FOOD_CATEGORIES.length - 1) }, "Précédent"),
      h("button", { class:"primary", onclick:() => go("done") }, "Valider mes réponses")),
    h("div", { class:"nav", style:"margin-top:10px" }, h("button", { class:"ghost", style:"flex:1", onclick:restart }, "Recommencer")));
}

/* Lignes du profil. Une réponse absente s'écrit « non renseigné », jamais 0.
   Les réponses devenues hors sujet (ex. durée de séance avec 0 séance) sont ignorées. */
function profileLines(){
  const p = P(), NR = "non renseigné";
  const n = k => p[k] ? `${String(p[k]).replace(".", ",")} ${NUMS[k].unit}` : NR;
  const sport = doesSport()
    ? `${label("sessions", p.sessions)} / semaine · ${p.duration ? label("duration", p.duration) : NR} · ${p.sportType.length ? p.sportType.map(v => label("sportType", v)).join(", ") : NR}`
    : (p.sessions === "0" ? "Aucune séance" : NR);
  const goal = p.goal ? label("goal", p.goal) + (p.goal !== "maintien" ? ` · rythme : ${p.pace ? label("pace", p.pace).toLowerCase() : NR}` : "") : NR;
  return [
    ["Sexe", p.sex ? label("sex", p.sex) : NR],
    ["Âge", n("age")],
    ["Taille", n("height")],
    ["Poids", n("weight")],
    ["Travail", p.job ? label("job", p.job) : NR],
    ["Objectif", goal],
    ["Tour de taille", n("waist")],
    ["Pas par jour", p.steps ? label("steps", p.steps) : NR],
    ["Sport", sport],
    ["Poids sur 4 semaines", (p.trend ? label("trend", p.trend) : NR) + (p.weight4w ? ` (il y a 4 semaines : ${n("weight4w")})` : "")]
  ];
}
function safetyLines(){
  const p = P(), NR = "non renseigné";
  return [
    isFemale() ? ["Grossesse, allaitement ou accouchement récent", p.pregnant ? label("pregnant", p.pregnant) : NR] : null,
    ["Maladie ou traitement influençant l'alimentation", p.medical ? label("medical", p.medical) : NR],
    ["Relation compliquée avec la nourriture", p.eating ? label("eating", p.eating) : NR],
    ["Allergies ou intolérances", p.allergies.trim() || "aucune signalée"]
  ].filter(Boolean);
}

function summaryText(){
  const lines = ["MON PROFIL"];
  profileLines().forEach(([k, v]) => lines.push(`${k} : ${v}`));
  lines.push("", "SÉCURITÉ" + (safetyFlag() ? " — À VOIR AVEC GUILLAUME AVANT TOUTE PROPOSITION" : ""));
  safetyLines().forEach(([k, v]) => lines.push(`${k} : ${v}`));
  lines.push("", `MES ALIMENTS PRÉFÉRÉS (${state.selected.length})`, "");
  FOOD_CATEGORIES.forEach(cat => {
    const list = primaryFoods(cat.id).filter(f => isOn(f.id));
    lines.push(`${cat.label.toUpperCase()} (${list.length}) : ` + (list.length ? list.map(f => f.name + (f.custom ? " [ajouté, valeurs à renseigner]" : "")).join(", ") : "aucun"));
  });
  lines.push("", "IDENTIFIANTS : " + state.selected.join(","));
  return lines.join("\n");
}
/* Envoi du résumé : mêmes boutons que le questionnaire (WhatsApp / e-mail pré-remplis, résumé copié automatiquement) */
const WHATSAPP_NUMBER = "33699906737";
const EMAIL_TO = "g.descrosses@hotmail.fr";

function renderDone(){
  const n = state.selected.length, text = summaryText();
  const status = h("div", { class:"status", role:"status", "aria-live":"polite" });
  const ta = h("textarea", { class:"out", readonly:true, "aria-label":"Résumé de vos réponses" }); ta.value = text;
  const intro = "Bonjour, voici mon profil et ma sélection d'aliments. Je colle le résumé ci-dessous :\n\n";
  const copy = async () => {
    const msg = "Résumé copié. Collez-le dans le message, puis envoyez.";
    try { await navigator.clipboard.writeText(text); status.textContent = msg; return; } catch(e){}
    try { ta.focus(); ta.select(); const ok = document.execCommand("copy"); status.textContent = ok ? msg : "Sélectionnez le texte et copiez-le à la main."; }
    catch(e){ status.textContent = "Sélectionnez le texte et copiez-le à la main."; }
  };
  return h("div", {},
    h("h1", {}, "Merci, vos réponses sont notées"),
    h("p", { class:"lead" }, `${n > 1 ? n + " aliments retenus" : n + " aliment retenu"}. Ils serviront de base à vos futurs menus, avec des quantités adaptées à votre profil.`),
    h("p", { class:"lead" }, "Relisez le résumé. En appuyant sur WhatsApp ou e-mail, il est copié automatiquement : il vous reste à le coller dans le message (appui long, puis « Coller ») et à envoyer."),
    ta,
    h("div", { class:"actions" },
      h("a", { class:"btn primary", href:"https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(intro), target:"_blank", rel:"noopener noreferrer", onclick:() => { copy(); } }, "Envoyer par WhatsApp"),
      h("a", { class:"btn", href:"mailto:" + EMAIL_TO + "?subject=" + encodeURIComponent("Mon plan alimentaire : profil et aliments") + "&body=" + encodeURIComponent(intro), target:"_blank", rel:"noopener noreferrer", onclick:() => { copy(); } }, "Envoyer par e-mail"),
      h("button", { type:"button", onclick:copy }, "Copier le résumé seulement"),
      status),
    h("div", { class:"nav" },
      h("button", { class:"ghost", onclick:() => go("recap") }, "Modifier mes réponses")));
}

function render(){
  const app = document.getElementById("app"); app.replaceChildren();
  app.append(state.step === "intro" ? renderIntro() : PROFILE_STEPS.includes(state.step) ? renderProfile(state.step) : state.step === "recap" ? renderRecap() : state.step === "done" ? renderDone() : renderStep(state.step));
  renderBar();
}

checkData();
load();
render();
