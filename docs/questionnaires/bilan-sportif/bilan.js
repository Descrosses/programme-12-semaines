
"use strict";
/* ---------- utilitaires ---------- */
function h(tag, props, ...kids){
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(props || {})){
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, "");
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()){
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(c));
  }
  return e;
}
const KEY = "bilan_sportif_v1";
let S = { name:"", profil:"", situ:[], A:{}, step:-1, consent:"" };
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch(e){}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }

/* ---------- questionnaire ---------- */
const OBJ = ["Perdre du poids / de la masse grasse","Prendre du muscle","Devenir plus fort","Améliorer explosivité / vitesse / qualités athlétiques","Me renforcer musculairement (sans viser la prise de masse)","Améliorer ma mobilité / ma posture","Améliorer condition physique / endurance","Reprendre le sport","Santé / bien-être","Préparation à un sport ou une épreuve","Autre"];
const PRIO = ["Résultats physiques","Force","Muscle","Explosivité","Endurance","Mobilité","Santé","Performance sportive","Esthétique","Énergie au quotidien","Autre"];
const QUAL = ["Force maximale","Puissance / explosivité","Accélération","Vitesse","Détente","Agilité","Endurance","Capacité à répéter des efforts intenses","Masse musculaire","Mobilité","Gainage","Autre"];
const CONTR = ["Travail","Horaires décalés","Déplacements","Peu de temps pour cuisiner","Budget","Repas en famille","Cantine / restaurant","Pas de frigo","Pas de micro-ondes","Autre","Aucune"];
const MAT = ["Plateformes / espace pour sauter","Médecine-ball","Traîneau","Landmine","Kettlebells","Élastiques","Trap bar","Barre olympique + disques","Espace de sprint","Vélo / rameur / SkiErg","Chronomètre / appli vidéo","Autre"];
const SC = ["1","2","3","4","5","6","7","8","9","10"];
const PAS_PREF = "Je ne sais pas / pas de préférence";
const METHODES = ["Musculation","Pilates","Entraînement fonctionnel","Circuit training","Cardio","Mobilité / étirements","Poids du corps (sans matériel)",PAS_PREF];
const hasMethode = (A,m) => (A.q3b||[]).includes(m);
const AUCUN = "Aucun de ces exercices";
const CHECK11 = [
  {l:"Jambes",o:["Squat avec barre","Squat gobelet / avec haltère","Presse à cuisses","Fentes / split squat","Soulevé de terre","Soulevé de terre roumain","Hip thrust","Leg curl / leg extension"]},
  {l:"Pectoraux et épaules",o:["Développé couché","Développé incliné","Pompes","Dips","Développé militaire","Élévations latérales"]},
  {l:"Dos et bras",o:["Tractions","Tirage vertical","Rowing (barre, haltère ou machine)","Curl biceps","Extensions triceps"]},
  {l:"Explosivité",o:["Épaulé / power clean","Kettlebell swing","Sauts / pliométrie","Sprints"]},
  {l:"Gainage et cardio",o:["Planche / gainage","Roue abdominale","Course à pied","Vélo / rameur"]},
  {l:"Pilates",o:["The Hundred","Roll-up","Single leg stretch","Pont fessier (bridge)","Planche (plank)","Swimming"],show:A=>hasMethode(A,"Pilates")},
  {l:"",o:[AUCUN]}
];
const DAYS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const YN = ["Oui","Non"];
const mkRm = ph => [{k:"exo",l:"Exercice que tu fais à la place (si tu ne fais pas celui-ci)",type:"text",ph:ph,wide:true},{k:"kg",l:"Charge",u:"kg"},{k:"reps",l:"Répétitions",u:"reps"}];
function isRed(A){ return ["h1","h2","h3","h4"].some(k=>A[k]==="Oui"); }
function vigilance(){
  const A = S.A, reds = [], oranges = [];
  if (A.h1==="Oui") reds.push("douleur ou pression à la poitrine");
  if (A.h2==="Oui") reds.push("malaise ou vertiges inexpliqués");
  if (A.h3==="Oui") reds.push("problème de cœur ou de tension");
  if (A.h4==="Oui") reds.push("essoufflement anormal");
  if (A.h5==="Oui") oranges.push("maladie chronique ou restriction médicale");
  if (A.h6==="Oui") oranges.push("grossesse en cours");
  if (A.q6==="Oui") oranges.push("douleur ou blessure actuelle");
  const none = /^\s*(non|aucun|aucune|rien|ras|n\/a|-)?\s*\.?\s*$/i;
  if (A.q7 && !none.test(A.q7)) oranges.push("antécédents médicaux");
  if (A.q8 && !none.test(A.q8)) oranges.push("traitement ou consigne médicale");
  S.situ.filter(k=>["pp","b","s","a"].includes(k)).forEach(k=>oranges.push(SITUATIONS.find(x=>x.key===k).l.toLowerCase()));
  return {reds, oranges, level: reds.length ? "ROUGE" : (oranges.length ? "ORANGE" : "VERT")};
}
function goals(A){
  const q3 = A.q3 || "", q5 = A.q5 || [];
  const athle = ["Améliorer explosivité / vitesse / qualités athlétiques","Préparation à un sport ou une épreuve"].includes(q3) || q5.includes("Explosivité") || q5.includes("Performance sportive");
  const force = athle || ["Devenir plus fort","Prendre du muscle"].includes(q3) || q5.includes("Force") || q5.includes("Muscle") || hasMethode(A,"Musculation");
  return {athle, force};
}

const SECTIONS = [
 { id:"depistage", title:"Ta sécurité d'abord", mod:1, intro:"Quelques questions courtes pour vérifier que tu peux t'entraîner sans risque. Réponds honnêtement : ce n'est pas un test, c'est ce qui permet de t'orienter correctement.", qs:[
  {id:"h1",req:true,n:"S1",s:"Douleur ou pression à la poitrine",t:"As-tu déjà ressenti une douleur ou une pression dans la poitrine, à l'effort ou au repos ?",type:"single",opts:YN},
  {id:"h2",req:true,n:"S2",s:"Malaise ou vertiges",t:"As-tu eu un malaise, une perte de connaissance ou des vertiges inexpliqués récemment ?",type:"single",opts:YN},
  {id:"h3",req:true,n:"S3",s:"Cœur ou tension",t:"Un médecin t'a-t-il déjà parlé d'un problème de cœur ou d'une tension trop élevée ?",type:"single",opts:YN},
  {id:"h4",req:true,n:"S4",s:"Essoufflement anormal",t:"Es-tu essoufflé(e) de façon anormale pour un effort léger (monter un étage, marcher vite) ?",type:"single",opts:YN},
  {id:"h5",req:true,n:"S5",s:"Maladie chronique / restriction",t:"As-tu une maladie chronique (diabète, asthme sévère…) ou un médecin t'a-t-il conseillé de limiter l'activité physique ?",type:"single",opts:YN},
  {id:"h6",req:true,n:"S6",s:"Grossesse en cours",t:"Es-tu enceinte actuellement ?",type:"single",opts:["Oui","Non","Non concerné(e)"]}
 ]},
 { title:"Profil et objectif", mod:1, qs:[
  {id:"q1",req:true,n:"1",s:"Âge",t:"Quel âge as-tu ?",type:"num",unit:"ans"},
  {id:"q2",req:true,n:"2",s:"Sexe / taille / poids",t:"Sexe, taille et poids actuel",type:"group",fields:[
    {k:"sexe",l:"Sexe",type:"select",opts:["Femme","Homme","Autre","Préfère ne pas répondre"],wide:true},
    {k:"taille",l:"Taille",u:"cm"},{k:"poids",l:"Poids",u:"kg"}]},
  {id:"q3",req:true,n:"3",s:"Objectif principal",t:"Quel est ton objectif principal ?",type:"single",opts:OBJ,other:true},
  {id:"q3b",req:true,n:"3b",s:"Méthodes / entraînements souhaités",t:"Avec quel type d'entraînement veux-tu atteindre cet objectif ?",hint:"Plusieurs choix possibles : ce que tu aimes ou veux essayer.",type:"multi",opts:METHODES,exclusive:PAS_PREF},
  {id:"q3c",n:"3c",s:"Expérience en Pilates",t:"Quelle est ton expérience en Pilates ?",type:"single",opts:["Jamais pratiqué","Quelques séances","Régulier depuis moins d'un an","Régulier depuis plus d'un an"],show:A=>hasMethode(A,"Pilates")},
  {id:"q4",n:"4",s:"Objectif chiffré / échéance",t:"As-tu un objectif chiffré ou une échéance ?",hint:"Ex. −8 kg, squat à 150 kg, courir 10 km, compétition dans 4 mois.",type:"area"},
  {id:"q5",n:"5",s:"3 priorités",t:"Quels sont tes 3 critères les plus importants ?",hint:"Jusqu'à 3 choix.",type:"multi",opts:PRIO,max:3,other:true}
 ]},
 { title:"Santé et limitations", mod:1, qs:[
  {id:"q6",req:true,n:"6",s:"Douleur / blessure actuelle",t:"As-tu actuellement une douleur, une blessure ou une gêne ?",type:"single",opts:YN},
  {id:"q6b",req:true,n:"6b",s:"Détail douleur",t:"Précise la zone, les mouvements qui déclenchent la douleur et son intensité de 0 à 10.",type:"area",show:A=>A.q6==="Oui"},
  {id:"q7",req:true,n:"7",s:"Antécédents médicaux / chirurgicaux",t:"As-tu des antécédents médicaux ou chirurgicaux qui peuvent influencer l'entraînement ou l'alimentation ?",hint:"Écris « non » si ce n'est pas le cas.",type:"area"},
  {id:"q8",req:true,n:"8",s:"Traitement / consigne médicale",t:"Prends-tu un traitement, ou as-tu reçu une consigne médicale qui peut modifier ta pratique sportive ou ton alimentation ?",hint:"Écris « non » si ce n'est pas le cas.",type:"area"}
 ]},
 { title:"Niveau et expérience", mod:1, qs:[
  {id:"q9",req:true,n:"9",s:"Niveau",t:"Quel est ton niveau actuel en musculation / préparation physique ?",type:"single",opts:["Jamais pratiqué","Débutant (moins d'1 an)","Intermédiaire (1 à 3 ans)","Confirmé (3 à 5 ans)","Avancé (plus de 5 ans)"]},
  {id:"q10",req:true,n:"10",s:"Sports et entraînements actuels",t:"Quels sports ou entraînements fais-tu actuellement, en dehors de ce programme ?",hint:"Match, club, course, salle, vélo… Indique les jours, la durée et l'intensité. Écris « rien » si tu ne fais rien.",type:"area"},
  {id:"q11",n:"11",s:"Exercices maîtrisés",t:"Quels exercices maîtrises-tu déjà correctement ?",hint:"Coche tout ce que tu sais faire avec une bonne technique. Si tu débutes, coche la dernière case.",type:"check",groups:CHECK11}
 ]},
 { title:"Organisation", mod:1, qs:[
  {id:"q12",req:true,n:"12",s:"Séances par semaine",t:"Combien de séances peux-tu réellement faire chaque semaine ?",type:"num",unit:"séances"},
  {id:"q12b",req:true,n:"12b",s:"Durée souhaitée",t:"Sur quelle durée souhaites-tu suivre ton programme ?",hint:"La durée finale pourra être ajustée selon ton objectif, ton niveau et tes disponibilités.",type:"single",opts:["4 semaines (cycle court)","8 semaines (cycle standard)","12 semaines (cycle complet)","16 semaines (cycle long)","J'ai une échéance précise","Je ne sais pas : recommande-moi une durée"]},
  {id:"q12c",req:true,n:"12c",s:"Date de l'échéance",t:"Quelle est la date de ton échéance, et de quoi s'agit-il ?",hint:"Ex. mariage le 12 juin, compétition le 3 mars.",type:"text",show:A=>A.q12b==="J'ai une échéance précise"},
  {id:"q13",req:"any",n:"13",s:"Disponibilités",t:"Tes disponibilités réalistes, jour par jour",hint:"Indique le temps en minutes. Mets 0 si c'est impossible.",type:"group",zero:true,fields:DAYS.map(d=>({k:d,l:d,u:"min"}))},
  {id:"q14",req:true,n:"14",s:"Lieu",t:"Où vas-tu principalement t'entraîner ?",type:"single",opts:["Maison","Salle","Extérieur","Plusieurs lieux"]},
  {id:"q15",req:true,n:"15",s:"Matériel",t:"Quel matériel as-tu réellement à disposition ?",hint:"Ex. rack, barre, haltères, poulies, machines, kettlebells, élastiques, tapis, ballon, reformer, cardio, espace de sprint…",type:"area"}
 ]},
 { title:"Alimentation", mod:1, qs:[
  {id:"q16",req:true,n:"16",s:"Objectif alimentaire",t:"Quel est ton objectif alimentaire principal ?",type:"single",opts:["Perte de graisse","Maintien du poids / recomposition","Prise de poids / muscle","Soutenir les performances","Améliorer la qualité de l'alimentation","Je ne sais pas"]},
  {id:"q17",n:"17",s:"Journée alimentaire type",t:"Décris une journée alimentaire normale, avec les quantités approximatives si possible.",hint:"Petit-déjeuner, collations, déjeuner, dîner, boissons.",type:"area"},
  {id:"q18",n:"18",s:"Repas / collations souhaités",t:"Combien de repas et collations souhaites-tu idéalement par jour ?",type:"num",unit:"par jour"},
  {id:"q19",req:true,n:"19",s:"Allergies / intolérances / régime",t:"As-tu des allergies, des intolérances, des aliments interdits ou un régime particulier ?",hint:"Écris « non » si ce n'est pas le cas.",type:"area"},
  {id:"q20",n:"20",s:"Aliments refusés / à garder",t:"Quels aliments refuses-tu de manger, ou veux-tu absolument garder ?",type:"area"},
  {id:"q21",n:"21",s:"Contraintes alimentaires",t:"Quelles sont tes contraintes pour manger correctement ?",hint:"Plusieurs choix possibles.",type:"multi",opts:CONTR,other:true},
  {id:"q22",n:"22",s:"Boissons",t:"Combien bois-tu environ par jour ?",hint:"Eau, puis café, sodas, boissons énergétiques et alcool si tu en consommes.",type:"area"}
 ]},
 { title:"Récupération et quotidien", mod:1, qs:[
  {id:"q23",n:"23",s:"Sommeil (heures)",t:"Combien d'heures dors-tu réellement par nuit ?",type:"num",unit:"heures"},
  {id:"q23b",n:"23b",s:"Qualité du sommeil /10",t:"Comment juges-tu la qualité de ton sommeil ?",hint:"1 = très mauvaise, 10 = excellente.",type:"scale"},
  {id:"q24",n:"24",s:"Stress /10",t:"Quel est ton niveau moyen de stress ?",hint:"1 = très faible, 10 = très élevé.",type:"scale"},
  {id:"q25",n:"25",s:"Activité quotidienne",t:"En dehors du sport, ton quotidien est physiquement…",type:"single",opts:["Très sédentaire","Plutôt sédentaire","Modérément actif","Actif","Très physique"]},
  {id:"q25b",n:"25b",s:"Métier",t:"Ton métier (facultatif)",type:"text"}
 ]},
 { title:"Historique d'entraînement", mod:2, qs:[
  {id:"q26",n:"26",s:"Ancienneté / fréquence",t:"Depuis combien de temps t'entraînes-tu sérieusement, et à quelle fréquence ces 6 derniers mois ?",type:"group",fields:[{k:"ans",l:"Ancienneté",u:"ans"},{k:"freq",l:"Fréquence",u:"séances/sem"}]},
  {id:"q27",n:"27",s:"Dernier programme",t:"À quoi ressemblait ton dernier programme ?",hint:"Split, nombre de séances, principaux exercices, séries et répétitions.",type:"area"},
  {id:"q28",show:A=>goals(A).athle,n:"28",s:"Qualités à développer",t:"Quelles sont les 3 qualités physiques à développer en priorité ?",hint:"Maximum 3 choix.",type:"multi",opts:QUAL,max:3,other:true},
  {id:"q29",n:"29",s:"Points forts / faibles",t:"Quels sont, selon toi, tes principaux points forts et points faibles ?",type:"area"},
  {id:"q36",n:"36",s:"Mobilité",t:"As-tu des limitations de mobilité connues ?",hint:"Chevilles, hanches, épaules, squat profond… Écris « non » sinon.",type:"area"}
 ]},
 { title:"Repères de force (facultatif)", mod:2, showIf:A=>goals(A).force, intro:"Pas besoin de tester ton maximum maintenant : la première semaine du programme sert à le mesurer. Si tu connais une charge récente réalisée avec une technique propre, indique-la. Si tu ne fais pas ces exercices, écris ceux que tu fais à la place. Sinon, laisse vide.", qs:[
  {id:"q30",n:"30",s:"Squat ou équivalent",t:"Squat ou équivalent : dernière charge connue",hint:"Tu ne fais pas de squat ? Écris ton exercice pour les jambes. Laisse vide si tu ne sais pas.",type:"group",rm:true,fields:mkRm("ex. presse à cuisses, hack squat")},
  {id:"q31",n:"31",s:"Développé couché ou équivalent",t:"Développé couché ou équivalent : dernière charge connue",hint:"Tu ne fais pas de développé couché ? Écris ton exercice pour les pectoraux. Laisse vide si tu ne sais pas.",type:"group",rm:true,fields:mkRm("ex. développé incliné haltères, machine")},
  {id:"q32",n:"32",s:"Soulevé de terre ou équivalent",t:"Soulevé de terre ou équivalent : dernière charge connue",hint:"Tu ne fais pas de soulevé de terre ? Écris ton exercice pour le dos et l'arrière des jambes. Laisse vide si tu ne sais pas.",type:"group",rm:true,fields:mkRm("ex. soulevé de terre roumain, trap bar")},
  {id:"q33",n:"33",s:"Tractions ou équivalent",t:"Tractions ou équivalent : dernière performance connue",hint:"Tu ne fais pas de tractions ? Écris ton exercice pour le dos. Laisse vide ce que tu ne sais pas.",type:"group",fields:[
    {k:"exo",l:"Exercice que tu fais à la place",type:"text",ph:"ex. tirage vertical",wide:true},
    {k:"pdc",l:"Max au poids du corps",u:"reps"},{k:"lest",l:"Lest ajouté",u:"kg"},{k:"lestreps",l:"Répétitions avec lest",u:"reps"}]}
 ]},
 { title:"Récupération et matériel spécifique", mod:2, qs:[
  {id:"q38",n:"38",s:"Récupération /10",t:"Comment récupères-tu entre deux séances difficiles ?",hint:"1 = très mal, 10 = très bien.",type:"scale"},
  {id:"q40",show:A=>goals(A).athle,n:"40",s:"Équipement spécifique",t:"Quel équipement spécifique peux-tu utiliser ?",type:"multi",opts:MAT,other:true}
 ]},
 { title:"Objectif de perte de poids importante", mod:3, key:"p", qs:[
  {id:"p1",n:"P1",s:"Perte souhaitée",t:"Combien souhaites-tu perdre, et sur quelle durée ?",type:"group",fields:[{k:"kg",l:"À perdre",u:"kg"},{k:"mois",l:"Sur",u:"mois"}]},
  {id:"p2",n:"P2",s:"Variations de poids",t:"Ton poids a-t-il fortement varié ces dernières années ?",type:"area"},
  {id:"p3",n:"P3",s:"Régimes restrictifs",t:"As-tu déjà suivi des régimes très restrictifs ou connu des épisodes de perte de contrôle alimentaire ? (précision facultative)",type:"area"}
 ]},
 { title:"Sport spécifique", mod:3, key:"sp", qs:[
  {id:"sp1",n:"SP1",s:"Sport / poste / niveau",t:"Quel sport pratiques-tu, à quel poste ou rôle, et à quel niveau ?",type:"area"},
  {id:"sp2",n:"SP2",s:"Entraînements et compétitions",t:"Combien d'entraînements et de compétitions par semaine, et quels jours ?",type:"area"},
  {id:"sp3",n:"SP3",s:"Actions déterminantes",t:"Quelles actions déterminent le plus ta performance ?",hint:"Sprint, changements de direction, contacts, sauts, endurance, lancer… 3 maximum.",type:"area"},
  {id:"sp4",n:"SP4",s:"Prochaine échéance",t:"Quand commence ta prochaine compétition, saison ou échéance importante ?",type:"text"},
  {id:"sp5",n:"SP5",s:"Période",t:"Es-tu en pleine saison, en intersaison ou en préparation ?",type:"single",opts:["Pleine saison","Intersaison","Préparation"]}
 ]}
];

const SITUATIONS = [
  {key:"pp",l:"Post-partum"},{key:"b",l:"Reprise après blessure"},{key:"p",l:"Je veux perdre beaucoup de poids (10 kg ou plus)"},
  {key:"s",l:"Senior"},{key:"a",l:"Adolescent (moins de 18 ans)"},{key:"sp",l:"Préparation à un sport précis"}
];

function visibleSections(){
  return SECTIONS.filter(s => (s.mod===1 || (s.mod===2 && S.profil==="sportif") || (s.mod===3 && S.situ.includes(s.key))) && (!s.showIf || s.showIf(S.A)));
}

/* ---------- contrôles ---------- */
function setA(id, v){ S.A[id] = v; save(); refreshConditions(); }

function ctrlText(q){
  if (q.type === "area") return h("textarea",{id:q.id,"aria-label":q.t,oninput:e=>setA(q.id,e.target.value)}, S.A[q.id]||"");
  const i = h("input",{type:"text",id:q.id,"aria-label":q.t,oninput:e=>setA(q.id,e.target.value)}); i.value = S.A[q.id]||""; return i;
}
function numInput(id, label, val, onchange, unit){
  const i = h("input",{type:"text",inputmode:"decimal",id,"aria-label":label,oninput:e=>onchange(e.target.value)});
  i.value = val || "";
  return h("div",{class:"num"}, i, unit ? h("span",{},unit) : null);
}
function ctrlNum(q){ return numInput(q.id, q.t, S.A[q.id], v=>setA(q.id,v), q.unit); }

function ctrlChoice(q, multi){
  const cur = multi ? (S.A[q.id]||[]) : S.A[q.id];
  const scale = q.type === "scale";
  const opts = scale ? SC : q.opts;
  const wrap = h("div",{class:"chips",role: multi ? "group" : "radiogroup","aria-label":q.t});
  let otherBox = null;
  const hasOther = !!q.other;
  const otherOn = () => multi ? (S.A[q.id]||[]).includes("Autre") : S.A[q.id]==="Autre";
  opts.forEach(o=>{
    const inp = h("input",{type: multi?"checkbox":"radio",name:q.id,value:o});
    inp.checked = multi ? cur.includes(o) : cur===o;
    inp.addEventListener("change",()=>{
      if (multi){
        if (q.exclusive && inp.checked){
          wrap.querySelectorAll("input").forEach(x=>{ if ((o===q.exclusive && x!==inp) || (o!==q.exclusive && x.value===q.exclusive)) x.checked = false; });
        }
        let arr = Array.from(wrap.querySelectorAll("input:checked")).map(x=>x.value);
        if (q.max && arr.length>q.max){ inp.checked=false; arr = arr.filter(x=>x!==o); }
        setA(q.id, arr);
      } else setA(q.id, o);
      if (otherBox) otherBox.hidden = !otherOn();
    });
    wrap.append(h("label",{class:"chip"}, inp, h("span",{},o)));
  });
  const out = h("div",{class: scale?"scale":""}, wrap);
  if (hasOther){
    const oi = h("input",{type:"text",placeholder:"Précise : autre",class:"",oninput:e=>{S.A[q.id+"_o"]=e.target.value;save();}});
    oi.value = S.A[q.id+"_o"]||"";
    otherBox = h("div",{class:"other"}, oi);
    otherBox.hidden = !otherOn();
    out.append(otherBox);
  }
  return out;
}

function ctrlChecklist(q){
  const cur = S.A[q.id] || [];
  const box = h("div",{role:"group","aria-label":q.t});
  const inputs = [];
  q.groups.forEach(g=>{
    if (g.show && !g.show(S.A)) return;
    if (g.l) box.append(h("span",{class:"gl"},g.l));
    const wrap = h("div",{class:"chips"});
    g.o.forEach(o=>{
      const inp = h("input",{type:"checkbox",value:o});
      inp.checked = cur.includes(o);
      inp.addEventListener("change",()=>{
        if (inp.checked){
          if (o === AUCUN) inputs.forEach(x=>{ if (x!==inp) x.checked = false; });
          else inputs.forEach(x=>{ if (x.value === AUCUN) x.checked = false; });
        }
        setA(q.id, inputs.filter(x=>x.checked).map(x=>x.value));
      });
      inputs.push(inp);
      wrap.append(h("label",{class:"chip"}, inp, h("span",{},o)));
    });
    box.append(wrap);
  });
  const oi = h("input",{type:"text",placeholder:"Autre exercice (facultatif)",oninput:e=>{S.A[q.id+"_o"]=e.target.value;save();}});
  oi.value = S.A[q.id+"_o"] || "";
  box.append(h("div",{class:"other"}, oi));
  return box;
}

function ctrlGroup(q){
  const val = S.A[q.id] || {};
  const g = h("div",{class:"grid"});
  q.fields.forEach(f=>{
    const id = q.id+"_"+f.k;
    let input;
    if (f.type==="select"){
      input = h("select",{id,onchange:e=>{const o=Object.assign({},S.A[q.id]||{});o[f.k]=e.target.value;setA(q.id,o);}},
        h("option",{value:""},"Choisir"), f.opts.map(o=>h("option",{value:o},o)));
      input.value = val[f.k]||"";
    } else if (f.type==="text"){
      input = h("input",{type:"text",id,placeholder:f.ph||"","aria-label":f.l,oninput:e=>{const o=Object.assign({},S.A[q.id]||{});o[f.k]=e.target.value;setA(q.id,o);}});
      input.value = val[f.k]||"";
    } else {
      input = numInput(id, f.l, val[f.k], v=>{const o=Object.assign({},S.A[q.id]||{});o[f.k]=v;setA(q.id,o);}, f.u);
    }
    g.append(h("div",{class:"f"+(f.wide?" wide":"")}, h("label",{for:id},f.l), input));
  });
  return g;
}

function buildQuestion(q){
  let ctrl;
  if (q.type==="text"||q.type==="area") ctrl = ctrlText(q);
  else if (q.type==="num") ctrl = ctrlNum(q);
  else if (q.type==="single"||q.type==="scale") ctrl = ctrlChoice(q,false);
  else if (q.type==="multi") ctrl = ctrlChoice(q,true);
  else if (q.type==="group") ctrl = ctrlGroup(q);
  else if (q.type==="check") ctrl = ctrlChecklist(q);
  const wrap = h("div",{class:"q","data-q":q.id},
    h("span",{class:"ql"}, q.t, q.req ? h("span",{class:"star","aria-hidden":"true"}," *") : null),
    q.hint ? h("span",{class:"hint"}, q.hint) : null,
    ctrl,
    q.req ? h("span",{class:"errmsg",role:"alert"},"Cette réponse est nécessaire pour continuer.") : null);
  if (q.show) wrap.hidden = !q.show(S.A);
  return wrap;
}
function refreshConditions(){
  document.querySelectorAll("[data-q]").forEach(el=>{
    const q = findQ(el.getAttribute("data-q"));
    if (q && q.show) el.hidden = !q.show(S.A);
    if (q && el.classList.contains("err") && answered(q)) el.classList.remove("err");
  });
}
function answered(q){
  const v = S.A[q.id];
  if (q.type === "group"){
    const o = v || {};
    const vals = q.fields.map(f=>String(o[f.k]||"").trim());
    return q.req === "any" ? vals.some(Boolean) : vals.every(Boolean);
  }
  if (Array.isArray(v)) return v.length > 0;
  return v != null && String(v).trim() !== "";
}
function validateSection(sec){
  let first = null;
  sec.qs.forEach(q=>{
    const el = app.querySelector('[data-q="'+q.id+'"]');
    if (!el) return;
    const need = q.req && (!q.show || q.show(S.A));
    const bad = need && !answered(q);
    el.classList.toggle("err", !!bad);
    if (bad && !first) first = el;
  });
  return first;
}
function findQ(id){ for (const s of SECTIONS) for (const q of s.qs) if (q.id===id) return q; return null; }

/* ---------- écrans ---------- */
const app = document.getElementById("app");
const bar = document.getElementById("bar");

function go(step){
  S.step = step; save(); render(); window.scrollTo(0,0);
}
function updateBar(secs){
  if (S.step < 0){ bar.hidden = true; return; }
  bar.hidden = false;
  const total = secs.length;
  const n = Math.min(S.step+1, total);
  document.getElementById("stepLabel").textContent = S.step>=total ? "Terminé" : "Étape "+n+" sur "+total;
  document.getElementById("modLabel").textContent = S.step>=total ? "" : (secs[S.step].mod===1?"Tronc commun":secs[S.step].mod===2?"Performance":"Situation particulière");
  document.getElementById("fill").style.width = (S.step>=total ? 100 : (S.step/total)*100) + "%";
}

function renderIntro(){
  app.replaceChildren(
    h("h1",{},"Bilan sportif et nutrition"),
    h("p",{class:"lead"},"Quelques questions pour construire un programme d'entraînement et un plan alimentaire adaptés à toi. Compte 10 à 15 minutes. À la fin, tu récupères un résumé à envoyer à ton coach."),
    h("div",{class:"notice"},"En cas de problème cardiaque ou respiratoire connu, de douleur persistante, de malaise à l'effort, de grossesse, d'accouchement récent ou de blessure importante, demande l'avis d'un médecin avant de commencer ou de reprendre."),
    h("div",{class:"sheet"},
      h("div",{class:"q"}, h("label",{class:"ql",for:"name"},"Ton prénom"),
        (()=>{const i=h("input",{type:"text",id:"name",autocomplete:"given-name",oninput:e=>{S.name=e.target.value;save();}});i.value=S.name;return i;})()),
      h("div",{class:"q"}, h("span",{class:"ql"},"Quel profil te ressemble le plus ?"),
        h("div",{class:"chips",role:"radiogroup","aria-label":"Profil"},
          [["debutant","Je débute ou je reprends"],["sportif","Je m'entraîne déjà régulièrement"]].map(([v,l])=>{
            const inp=h("input",{type:"radio",name:"profil",value:v}); inp.checked=S.profil===v;
            inp.addEventListener("change",()=>{S.profil=v;save();});
            return h("label",{class:"chip"},inp,h("span",{},l));
          }))),
      h("div",{class:"q"}, h("span",{class:"ql"},"Une situation particulière ?"), h("span",{class:"hint"},"Coche ce qui te concerne. Certaines situations ne sont pas encore prises en charge dans cette version : coche-les quand même, pour qu'on le sache."),
        h("div",{class:"chips situ",role:"group","aria-label":"Situations particulières"},
          SITUATIONS.map(s=>{
            const inp=h("input",{type:"checkbox",value:s.key}); inp.checked=S.situ.includes(s.key);
            inp.addEventListener("change",()=>{S.situ=Array.from(app.querySelectorAll('.situ input:checked')).map(x=>x.value);save();});
            return h("label",{class:"chip"},inp,h("span",{},s.l));
          }))),
      h("div",{class:"q",id:"consentBox"},
        h("label",{class:"consent"},
          (()=>{const c=h("input",{type:"checkbox",id:"consent"}); c.checked=!!S.consent; c.addEventListener("change",()=>{S.consent=c.checked?new Date().toLocaleDateString("fr-FR"):"";save();document.getElementById("consentBox").classList.remove("err");}); return c;})(),
          h("span",{},"J'accepte que mes réponses, y compris mes informations de santé, soient utilisées pour construire mon programme. Elles restent dans ton téléphone jusqu'à ce que tu les envoies. En les envoyant, tu les transmets à Guillaume (g.descrosses@hotmail.fr), qui les utilise uniquement pour construire ton programme, avec l'aide d'un outil d'intelligence artificielle. Tu peux demander à tout moment leur suppression en écrivant à cette adresse.")),
        h("span",{class:"errmsg",role:"alert"},"Ton accord est nécessaire pour continuer."))
    ),
    h("div",{class:"nav"}, h("button",{class:"primary",id:"start",onclick:()=>{
      if (!S.name.trim()){ document.getElementById("name").focus(); return; }
      if (!S.profil){ alert("Choisis le profil qui te ressemble le plus."); return; }
      if (!S.consent){ const b=document.getElementById("consentBox"); b.classList.add("err"); b.scrollIntoView({behavior:"smooth",block:"center"}); return; }
      const stop = scopeCheck();
      if (stop){ renderOut(stop); window.scrollTo(0,0); return; }
      go(0);
    }},"Commencer"))
  );
}

const HORS_SITU = {pp:"post-partum", b:"reprise après blessure", s:"senior", a:"adolescent"};
function scopeCheck(){
  const A = S.A;
  if (isRed(A)) return {type:"rouge"};
  if (A.h6==="Oui") return {type:"hors", why:"une grossesse en cours"};
  const age = parseFloat(String(A.q1||"").replace(",","."));
  if (isFinite(age) && age < 18) return {type:"hors", why:"un âge de moins de 18 ans"};
  const k = S.situ.find(x=>HORS_SITU[x]);
  if (k) return {type:"hors", why:"la situation « "+HORS_SITU[k]+" »"};
  return null;
}
function renderOut(r){
  const rouge = r.type === "rouge";
  app.replaceChildren(
    h("h2",{}, rouge ? "Avant de poursuivre" : "Cette version ne peut pas encore t'accueillir"),
    h("div",{class:"notice"}, rouge
      ? "Une de tes réponses indique une situation pour laquelle ce questionnaire ne permet pas de construire automatiquement un programme adapté en toute sécurité. Le questionnaire s'arrête donc ici pour le moment."
      : "D'après tes réponses ("+r.why+"), ce questionnaire ne permet pas, pour le moment, de construire un programme adapté en toute sécurité."),
    h("p",{class:"lead"}, rouge
      ? "Cela ne signifie pas que tu ne peux pas pratiquer une activité physique, mais ta situation nécessite d'abord un avis approprié. Pour ce type de symptômes, il est recommandé d'en parler à un médecin. Tu pourras refaire le questionnaire ensuite si ta situation entre dans le périmètre du programme."
      : "Cela ne signifie pas que tu ne peux pas pratiquer une activité physique : ta situation demande un accompagnement adapté, que cette version ne fournit pas encore."),
    h("p",{class:"hint"},"Une question sur le fonctionnement de ce questionnaire ? Écris à g.descrosses@hotmail.fr."),
    h("div",{class:"actions"},
      h("button",{type:"button",onclick:()=>go(S.step)},"Modifier mes réponses"),
      h("button",{type:"button",class:"ghost",onclick:()=>{ if(confirm("Effacer toutes tes réponses de ce téléphone ?")){ S={name:"",profil:"",situ:[],A:{},step:-1,consent:""}; save(); render(); window.scrollTo(0,0);} }},"Effacer mes réponses"))
  );
}

function renderSection(secs){
  const sec = secs[S.step];
  const last = S.step === secs.length-1;
  app.replaceChildren(
    h("h2",{},sec.title),
    sec.intro ? h("p",{class:"lead"},sec.intro) : document.createDocumentFragment(),
    sec.qs.some(q=>q.req) ? h("p",{class:"reqnote"},"Les questions marquées d'une étoile (*) sont nécessaires pour construire ton programme. Les autres sont facultatives.") : document.createDocumentFragment(),
    h("div",{class:"sheet"}, sec.qs.map(buildQuestion)),
    h("div",{class:"nav"},
      h("button",{class:"ghost",onclick:()=>go(S.step-1<0?-1:S.step-1)},"Retour"),
      h("button",{class:"primary",onclick:()=>{
        const bad = validateSection(sec);
        if (bad){ bad.scrollIntoView({behavior:"smooth",block:"center"}); return; }
        const stop = scopeCheck();
        if (stop){ renderOut(stop); window.scrollTo(0,0); return; }
        go(S.step+1);
      }}, last?"Voir mon résumé":"Suivant"))
  );
}

/* ---------- résumé ---------- */
function est1RM(kg, reps){
  const k = parseFloat(String(kg).replace(",",".")), r = parseFloat(String(reps).replace(",","."));
  if (!isFinite(k) || !isFinite(r) || k<=0 || r<1 || r>12) return null;
  return Math.round(r===1 ? k : k*(1+r/30));
}
function fmtAnswer(q){
  const v = S.A[q.id];
  if (q.type==="check" && (S.A[q.id+"_o"]||"").trim() && (!v || !v.length)) return "Autre : "+S.A[q.id+"_o"].trim();
  if (v==null || v==="" || (Array.isArray(v)&&!v.length)) return "";
  if (q.type==="num") return v+" "+(q.unit||"");
  if (q.type==="scale") return v+"/10";
  if (q.type==="check"){
    const arr = Array.isArray(v) ? v.slice() : [];
    const o = (S.A[q.id+"_o"]||"").trim();
    if (o) arr.push("Autre : "+o);
    return arr.join(", ");
  }
  if (q.type==="single"||q.type==="multi"){
    let arr = Array.isArray(v)?v.slice():[v];
    const o = S.A[q.id+"_o"];
    arr = arr.map(x=> x==="Autre" && o ? "Autre ("+o+")" : x);
    return arr.join(", ");
  }
  if (q.type==="group"){
    const parts = [];
    q.fields.forEach(f=>{
      const x = (v[f.k]||"").trim(); if (!x) return;
      if (q.zero) parts.push(f.l+" : "+(x==="0"?"impossible":x+" "+f.u));
      else if (q.rm) return;
      else parts.push((q.fields.length>1?f.l+" : ":"")+x+(f.u?" "+f.u:""));
    });
    if (q.rm){
      const exo=(v.exo||"").trim(), kg=(v.kg||"").trim(), re=(v.reps||"").trim();
      if (exo||kg||re){
        let out = exo ? exo+" : " : "";
        if (kg||re){
          out += (kg||"?")+" kg × "+(re||"?");
          const e = est1RM(kg,re); if (e && re!=="1") out += " (max estimé ≈ "+e+" kg)";
        } else out += "charge non renseignée";
        return out;
      }
      return "";
    }
    return q.zero ? parts.join(" ; ") : parts.join(" ; ");
  }
  return String(v).trim();
}

/* ---------- BASES DE PROGRAMME (données) : pour en ajouter une, ajouter un objet ci-dessous ----------
   criteres : { tag, valeurs, poids, requis }
   - requis : si ce critère ne correspond pas, la base est écartée
   - ecarteSiDifferent : écarte la base si la valeur est connue (ex. Homme ou Femme) et différente.
   - Le sexe n'est jamais requis et ne pèse que 1 point : il ne choisit jamais seul une base. */
const BASES = [
  {id:"force-explosivite", label:"Force + explosivité", criteres:[
    {tag:"objectif", valeurs:["Devenir plus fort","Améliorer explosivité / vitesse / qualités athlétiques","Préparation à un sport ou une épreuve"], poids:3, requis:true},
    {tag:"methodes", valeurs:["Musculation","Entraînement fonctionnel"], poids:1},
    {tag:"niveau", valeurs:["intermédiaire","avancé"], poids:1}]},
  {id:"prise-de-masse", label:"Prise de masse", criteres:[
    {tag:"objectif", valeurs:["Prendre du muscle"], poids:3, requis:true},
    {tag:"methodes", valeurs:["Musculation"], poids:2}]},
  {id:"perte-de-poids-homme", label:"Perte de poids (profil homme)", criteres:[
    {tag:"objectif", valeurs:["Perdre du poids / de la masse grasse"], poids:3, requis:true},
    {tag:"methodes", valeurs:["Musculation","Circuit training","Cardio","Entraînement fonctionnel","Poids du corps (sans matériel)"], poids:1},
    {tag:"sexe", valeurs:["Homme"], poids:1, ecarteSiDifferent:true}]},
  {id:"perte-de-poids-femme", label:"Perte de poids (profil femme)", criteres:[
    {tag:"objectif", valeurs:["Perdre du poids / de la masse grasse"], poids:3, requis:true},
    {tag:"methodes", valeurs:["Musculation","Circuit training","Cardio","Entraînement fonctionnel","Poids du corps (sans matériel)"], poids:1},
    {tag:"sexe", valeurs:["Femme"], poids:1, ecarteSiDifferent:true}]},
  {id:"pilates", label:"Pilates", criteres:[
    {tag:"methodes", valeurs:["Pilates"], poids:4, requis:true},
    {tag:"objectif", valeurs:["Perdre du poids / de la masse grasse","Me renforcer musculairement (sans viser la prise de masse)","Améliorer ma mobilité / ma posture","Santé / bien-être"], poids:1}]}
];
function niveauTag(q9){
  const v = q9 || "";
  if (v.startsWith("Jamais") || v.startsWith("Débutant")) return "débutant";
  if (v.startsWith("Intermédiaire") || v.startsWith("Confirmé")) return "intermédiaire";
  if (v.startsWith("Avancé")) return "avancé";
  return "";
}
function buildTags(){
  const A = S.A, g2 = A.q2 || {};
  const mins = DAYS.map(d=>parseFloat(String((A.q13||{})[d]||"").replace(",","."))).filter(x=>isFinite(x) && x>0);
  const obj = A.q3==="Autre" && (A.q3_o||"").trim() ? "Autre ("+A.q3_o.trim()+")" : (A.q3||"");
  return {
    objectif: obj,
    priorites: A.q5 || [],
    methodes: A.q3b || [],
    niveau: niveauTag(A.q9),
    lieu: A.q14 || "",
    materiel: (A.q15||"").trim(),
    seances: A.q12 || "",
    duree_max_seance_min: mins.length ? Math.max.apply(null,mins) : "",
    duree_programme: A.q12b || "",
    sexe: g2.sexe || "",
    contraintes_physiques: A.q6==="Oui" ? ((A.q6b||"").trim() || "douleur ou blessure déclarée") : "aucune douleur déclarée",
    preferences: (A.q11 && A.q11.length) ? A.q11 : []
  };
}
function suggestBases(tags){
  return BASES.map(b=>{
    let score = 0, ecarte = false;
    const raisons = [];
    b.criteres.forEach(c=>{
      const v = tags[c.tag], arr = Array.isArray(v) ? v : [v];
      const ok = arr.some(x=>c.valeurs.includes(x));
      if (ok){ score += c.poids; raisons.push(c.tag); }
      else if (c.requis) ecarte = true;
      else if (c.ecarteSiDifferent && arr.some(x=>x==="Homme" || x==="Femme")) ecarte = true;
    });
    return {id:b.id, label:b.label, score:ecarte?0:score, raisons};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
}
function buildSummary(){
  const secs = visibleSections();
  const L = [];
  const profilTxt = S.profil==="sportif" ? "Sportif (modules 1 et 2)" : "Débutant / remise en forme (module 1)";
  L.push("BILAN SPORTIF ET NUTRITION : "+(S.name.trim()||"Sans prénom"));
  L.push("Profil : "+profilTxt);
  if (S.situ.length) L.push("Situations particulières : "+S.situ.map(k=>SITUATIONS.find(s=>s.key===k).l).join(", "));
  const A = S.A;
  const vg = vigilance();
  if (vg.level==="ROUGE") L.push("NIVEAU DE VIGILANCE : ROUGE ("+vg.reds.join(", ")+"). Ne pas établir de programme.");
  else if (vg.level==="ORANGE") L.push("NIVEAU DE VIGILANCE : ORANGE ("+vg.oranges.join(", ")+"). Adapter le programme et vérifier avant de commencer.");
  else L.push("NIVEAU DE VIGILANCE : VERT (aucun signal détecté dans le dépistage).");
  if (S.consent) L.push("Consentement à l'utilisation des données donné le "+S.consent+".");
  const tg = buildTags();
  L.push("");
  L.push("OBJECTIF PRINCIPAL : "+(tg.objectif||"non renseigné"));
  L.push("MÉTHODES / ENTRAÎNEMENTS SOUHAITÉS : "+(tg.methodes.length ? tg.methodes.join(" + ") : "non renseigné"));
  let cur = 0;
  secs.forEach(sec=>{
    const lines = [];
    sec.qs.forEach(q=>{ if (q.show && !q.show(A)) return; const a = fmtAnswer(q); if (a) lines.push(q.n+". "+q.s+" : "+a); });
    if (!lines.length) return;
    if (sec.mod !== cur){ cur = sec.mod; L.push(""); L.push(cur===1?"=== TRONC COMMUN ===":cur===2?"=== PERFORMANCE ===":"=== SITUATIONS PARTICULIÈRES ==="); }
    L.push(""); L.push("["+sec.title+"]"); lines.forEach(x=>L.push(x));
  });
  L.push(""); L.push("=== ÉTIQUETTES POUR CHOISIR UNE BASE DE PROGRAMME ===");
  L.push("objectif : "+(tg.objectif||"-")+" | méthodes : "+(tg.methodes.join(", ")||"-")+" | niveau : "+(tg.niveau||"-"));
  L.push("lieu : "+(tg.lieu||"-")+" | séances/semaine : "+(tg.seances||"-")+" | durée max d'une séance : "+(tg.duree_max_seance_min?tg.duree_max_seance_min+" min":"-")+" | durée du programme : "+(tg.duree_programme||"-"));
  L.push("matériel : "+(tg.materiel||"-"));
  L.push("contraintes physiques : "+tg.contraintes_physiques);
  L.push("sexe (information, ne décide jamais seul) : "+(tg.sexe||"-"));
  const sug = suggestBases(tg);
  L.push(sug.length
    ? "bases candidates (indicatif, à valider par Guillaume) : "+sug.map((b,i)=>(i+1)+". "+b.label+" (score "+b.score+")").join(" ; ")+((sug.length>1 && sug[0].score-sug[1].score<=1) ? ". Les deux premières sont proches : combinaison possible (programme hybride)." : "")
    : "bases candidates : aucune ne correspond. Programme à construire sur mesure, ou base à créer.");
  return L.join("\n");
}

function renderSummary(){
  const text = buildSummary();
  const nom = S.name.trim();
  const subject = "Bilan sportif et nutrition : "+nom;
  const intro = "Bonjour, voici mon bilan sportif et nutrition"+(nom?" ("+nom+")":"")+".";
  const short = intro+" Je colle le résumé ci-dessous :\n\n";
  const fullBody = encodeURIComponent(intro+"\n\n"+text);
  const mailBody = fullBody.length < 6000 ? fullBody : encodeURIComponent(short);
  const mailIsFull = fullBody.length < 6000;
  const status = h("div",{class:"status",role:"status","aria-live":"polite"});
  const ta = h("textarea",{class:"out",readonly:true,"aria-label":"Résumé de tes réponses"}); ta.value = text;
  const copy = async (msg)=>{
    const m = typeof msg === "string" ? msg : "Résumé copié. Colle-le dans le message, puis envoie.";
    try { await navigator.clipboard.writeText(text); status.textContent = m; return; } catch(e){}
    try { ta.focus(); ta.select(); const ok = document.execCommand("copy"); status.textContent = ok ? m : "Sélectionne le texte et copie-le à la main."; }
    catch(e){ status.textContent = "Sélectionne le texte et copie-le à la main."; }
  };
  app.replaceChildren(
    h("h2",{},"Merci "+(nom||"")+", c'est terminé"),
    h("p",{class:"lead"}, mailIsFull
      ? "Relis ton résumé. Par e-mail, le message s'ouvre avec ton résumé déjà dedans : appuie sur envoyer. Par WhatsApp, le résumé est copié : colle-le dans le message (appui long, puis « Coller »), puis envoie."
      : "Relis ton résumé. En appuyant sur WhatsApp ou e-mail, il est copié automatiquement : colle-le dans le message (appui long, puis « Coller »), puis envoie."),
    ta,
    h("div",{class:"actions"},
      h("a",{class:"btn primary",href:"mailto:g.descrosses@hotmail.fr?subject="+encodeURIComponent(subject)+"&body="+mailBody,target:"_blank",rel:"noopener noreferrer",onclick:()=>{copy(mailIsFull ? "Résumé aussi copié, au cas où." : undefined);}},"Envoyer par e-mail"),
      h("a",{class:"btn",href:"https://wa.me/33699906737?text="+encodeURIComponent(short),target:"_blank",rel:"noopener noreferrer",onclick:()=>{copy();}},"Envoyer par WhatsApp"),
      h("button",{type:"button",onclick:()=>copy()},"Copier le résumé seulement"),
      status),
    h("div",{class:"nav"},
      h("button",{class:"ghost",onclick:()=>go(0)},"Modifier mes réponses"),
      h("button",{class:"ghost",onclick:()=>{ if(confirm("Effacer toutes les réponses et recommencer ?")){ S={name:"",profil:"",situ:[],A:{},step:-1,consent:""}; save(); render(); window.scrollTo(0,0);} }},"Recommencer"))
  );
}

function render(){
  const secs = visibleSections();
  if (S.step >= secs.length) S.step = secs.length;
  updateBar(secs);
  if (S.step < 0) renderIntro();
  else if (S.step >= secs.length) renderSummary();
  else renderSection(secs);
}
render();
