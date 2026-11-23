/* ==========================================================================
   BASE D'ALIMENTS — le SEUL fichier de données de cette étape
   --------------------------------------------------------------------------
   Chemin : foods.js (à côté de index.html)

   Valeurs : pour 100 g, dans l'état indiqué par "nutritionBasis"
   (cuit / cru / produit / partie comestible). Ce sont des valeurs MOYENNES
   DE RÉFÉRENCE, approximatives et NON VÉRIFIÉES (verified:false) : à contrôler
   avant tout usage (table Ciqual par exemple).

   Champs d'un aliment :
     category              catégorie principale (une seule : l'aliment n'est affiché qu'une fois)
     additionalCategories  autres catégories nutritionnelles (pour le futur moteur)
     nutritionBasis        référence affichée sur la carte
     referenceState        "cuit" | "cru" | "produit" | "comestible" (lisible par le code)
     tags                  pour le futur générateur de menus (non affichés)
     image                 nom d'un fichier dans images/foods/ (ex. "riz.jpg") ou null
     brandDependent        true si la valeur varie selon la marque : brand et productName
                           permettront de remplacer les valeurs par celles d'un produit précis
   ========================================================================== */

const IMAGE_DIR = "images/foods/";

const FOOD_CATEGORIES = [
  { id:"glucides",  label:"Glucides" },
  { id:"fruits",    label:"Fruits" },
  { id:"proteines", label:"Protéines" },
  { id:"lipides",   label:"Lipides" },
  { id:"legumes",   label:"Légumes" }
];

const FOODS = [
  // ===== GLUCIDES =====
  { id:"riz", name:"Riz", category:"glucides", additionalCategories:[], kcal:130, protein:2.7, carbs:28, fat:0.3, nutritionBasis:"100 g cuits", referenceState:"cuit", tags:["lunch", "dinner", "highCarb", "vegetarian"], image:null, verified:false },
  { id:"pates", name:"P\u00e2tes", category:"glucides", additionalCategories:[], kcal:158, protein:5.8, carbs:31, fat:0.9, nutritionBasis:"100 g cuites", referenceState:"cuit", tags:["lunch", "dinner", "highCarb", "vegetarian"], image:null, verified:false },
  { id:"pomme-de-terre", name:"Pommes de terre", category:"glucides", additionalCategories:[], kcal:87, protein:1.9, carbs:20, fat:0.1, nutritionBasis:"100 g cuites", referenceState:"cuit", tags:["lunch", "dinner", "highCarb", "vegetarian"], image:null, verified:false },
  { id:"patate", name:"Patate douce", category:"glucides", additionalCategories:[], kcal:90, protein:2, carbs:21, fat:0.2, nutritionBasis:"100 g cuites", referenceState:"cuit", tags:["lunch", "dinner", "highCarb", "vegetarian"], image:null, verified:false },
  { id:"flocons", name:"Flocons d'avoine", category:"glucides", additionalCategories:[], kcal:370, protein:13, carbs:60, fat:7, nutritionBasis:"100 g crus", referenceState:"cru", tags:["breakfast", "snack", "highCarb", "vegetarian"], image:null, verified:false },
  { id:"pain", name:"Pain complet", category:"glucides", additionalCategories:[], kcal:250, protein:10, carbs:44, fat:3.5, nutritionBasis:"100 g de produit", referenceState:"produit", tags:["breakfast", "snack", "lunch", "highCarb", "vegetarian"], image:null, brandDependent:true, brand:null, productName:null, verified:false },
  { id:"semoule", name:"Semoule", category:"glucides", additionalCategories:[], kcal:112, protein:3.8, carbs:23, fat:0.2, nutritionBasis:"100 g cuite", referenceState:"cuit", tags:["lunch", "dinner", "highCarb", "vegetarian"], image:null, verified:false },
  { id:"boulgour", name:"Boulgour", category:"glucides", additionalCategories:[], kcal:83, protein:3.1, carbs:18.6, fat:0.2, nutritionBasis:"100 g cuit", referenceState:"cuit", tags:["lunch", "dinner", "highCarb", "vegetarian"], image:null, verified:false },
  { id:"quinoa", name:"Quinoa", category:"glucides", additionalCategories:["proteines"], kcal:120, protein:4.4, carbs:21, fat:1.9, nutritionBasis:"100 g cuit", referenceState:"cuit", tags:["lunch", "dinner", "highCarb", "plantProtein", "vegetarian"], image:null, verified:false },

  // ===== FRUITS =====
  { id:"banane", name:"Banane", category:"fruits", additionalCategories:[], kcal:89, protein:1.1, carbs:23, fat:0.3, nutritionBasis:"100 g de partie comestible", referenceState:"comestible", tags:["breakfast", "snack", "fruit", "vegetarian"], image:null, verified:false },
  { id:"pomme", name:"Pomme", category:"fruits", additionalCategories:[], kcal:52, protein:0.3, carbs:14, fat:0.2, nutritionBasis:"100 g de partie comestible", referenceState:"comestible", tags:["breakfast", "snack", "fruit", "vegetarian"], image:null, verified:false },
  { id:"fruits-rouges", name:"Fruits rouges", category:"fruits", additionalCategories:[], kcal:45, protein:0.9, carbs:9, fat:0.4, nutritionBasis:"100 g de partie comestible", referenceState:"comestible", tags:["breakfast", "snack", "fruit", "vegetarian"], image:null, verified:false },
  { id:"orange", name:"Orange", category:"fruits", additionalCategories:[], kcal:47, protein:0.9, carbs:12, fat:0.1, nutritionBasis:"100 g de partie comestible", referenceState:"comestible", tags:["breakfast", "snack", "fruit", "vegetarian"], image:null, verified:false },
  { id:"kiwi", name:"Kiwi", category:"fruits", additionalCategories:[], kcal:61, protein:1.1, carbs:15, fat:0.5, nutritionBasis:"100 g de partie comestible", referenceState:"comestible", tags:["breakfast", "snack", "fruit", "vegetarian"], image:null, verified:false },

  // ===== PROTÉINES =====
  { id:"poulet", name:"Poulet", category:"proteines", additionalCategories:[], kcal:165, protein:31, carbs:0, fat:3.6, nutritionBasis:"100 g cuits", referenceState:"cuit", tags:["lunch", "dinner", "animalProtein"], image:null, verified:false },
  { id:"dinde", name:"Dinde", category:"proteines", additionalCategories:[], kcal:135, protein:30, carbs:0, fat:1, nutritionBasis:"100 g cuite", referenceState:"cuit", tags:["lunch", "dinner", "animalProtein"], image:null, verified:false },
  { id:"boeuf", name:"B\u0153uf maigre", category:"proteines", additionalCategories:[], kcal:175, protein:27, carbs:0, fat:7, nutritionBasis:"100 g cuit", referenceState:"cuit", tags:["lunch", "dinner", "animalProtein"], image:null, verified:false },
  { id:"oeufs", name:"\u0152ufs", category:"proteines", additionalCategories:["lipides"], kcal:155, protein:13, carbs:1.1, fat:11, nutritionBasis:"100 g cuits", referenceState:"cuit", tags:["breakfast", "lunch", "dinner", "animalProtein", "vegetarian"], image:null, verified:false },
  { id:"saumon", name:"Saumon", category:"proteines", additionalCategories:["lipides"], kcal:206, protein:22, carbs:0, fat:12, nutritionBasis:"100 g cuit", referenceState:"cuit", tags:["lunch", "dinner", "animalProtein", "highFat"], image:null, verified:false },
  { id:"thon", name:"Thon", category:"proteines", additionalCategories:[], kcal:116, protein:26, carbs:0, fat:1, nutritionBasis:"100 g de produit \u00e9goutt\u00e9", referenceState:"produit", tags:["lunch", "dinner", "animalProtein"], image:null, verified:false },
  { id:"poisson-blanc", name:"Poisson blanc", category:"proteines", additionalCategories:[], kcal:105, protein:23, carbs:0, fat:0.9, nutritionBasis:"100 g cuit", referenceState:"cuit", tags:["lunch", "dinner", "animalProtein"], image:null, verified:false },
  { id:"lentilles", name:"Lentilles", category:"proteines", additionalCategories:["glucides"], kcal:116, protein:9, carbs:20, fat:0.4, nutritionBasis:"100 g cuites", referenceState:"cuit", tags:["lunch", "dinner", "plantProtein", "highCarb", "vegetarian"], image:null, verified:false },
  { id:"haricots-rouges", name:"Haricots rouges", category:"proteines", additionalCategories:["glucides"], kcal:127, protein:8.7, carbs:23, fat:0.5, nutritionBasis:"100 g cuits", referenceState:"cuit", tags:["lunch", "dinner", "plantProtein", "highCarb", "vegetarian"], image:null, verified:false },
  { id:"skyr", name:"Skyr", category:"proteines", additionalCategories:[], kcal:63, protein:11, carbs:4, fat:0.2, nutritionBasis:"100 g de produit", referenceState:"produit", tags:["breakfast", "snack", "animalProtein", "vegetarian"], image:null, brandDependent:true, brand:null, productName:null, verified:false },
  { id:"fromage-blanc", name:"Fromage blanc", category:"proteines", additionalCategories:[], kcal:47, protein:8, carbs:4, fat:0.2, nutritionBasis:"100 g de produit", referenceState:"produit", tags:["breakfast", "snack", "animalProtein", "vegetarian"], image:null, brandDependent:true, brand:null, productName:null, verified:false },
  { id:"whey", name:"Prot\u00e9ines en poudre (whey)", category:"proteines", additionalCategories:[], kcal:400, protein:78, carbs:8, fat:6, nutritionBasis:"100 g de produit", referenceState:"produit", tags:["breakfast", "snack", "animalProtein", "vegetarian"], image:null, brandDependent:true, brand:null, productName:null, verified:false },

  // ===== LIPIDES =====
  { id:"amandes", name:"Amandes", category:"lipides", additionalCategories:["proteines"], kcal:579, protein:21, carbs:22, fat:50, nutritionBasis:"100 g de produit", referenceState:"produit", tags:["breakfast", "snack", "highFat", "vegetarian"], image:null, verified:false },
  { id:"noix", name:"Noix", category:"lipides", additionalCategories:[], kcal:654, protein:15, carbs:14, fat:65, nutritionBasis:"100 g de produit", referenceState:"produit", tags:["snack", "highFat", "vegetarian"], image:null, verified:false },
  { id:"chocolat-noir", name:"Chocolat noir \u2265 70 %", category:"lipides", additionalCategories:["glucides"], kcal:598, protein:7.8, carbs:46, fat:43, nutritionBasis:"100 g de produit", referenceState:"produit", tags:["snack", "highFat", "vegetarian"], image:null, brandDependent:true, brand:null, productName:null, verified:false },
  { id:"cacahuete", name:"Beurre de cacahu\u00e8te", category:"lipides", additionalCategories:["proteines"], kcal:600, protein:25, carbs:16, fat:50, nutritionBasis:"100 g de produit", referenceState:"produit", tags:["breakfast", "snack", "highFat", "vegetarian"], image:null, brandDependent:true, brand:null, productName:null, verified:false },
  { id:"huile", name:"Huile d'olive", category:"lipides", additionalCategories:[], kcal:884, protein:0, carbs:0, fat:100, nutritionBasis:"100 g de produit", referenceState:"produit", tags:["lunch", "dinner", "highFat", "vegetarian"], image:null, verified:false },
  { id:"avocat", name:"Avocat", category:"lipides", additionalCategories:[], kcal:160, protein:2, carbs:9, fat:15, nutritionBasis:"100 g de partie comestible", referenceState:"comestible", tags:["breakfast", "lunch", "dinner", "highFat", "vegetarian"], image:null, verified:false },

  // ===== LÉGUMES =====
  { id:"brocolis", name:"Brocolis", category:"legumes", additionalCategories:[], kcal:34, protein:2.8, carbs:7, fat:0.4, nutritionBasis:"100 g crus", referenceState:"cru", tags:["lunch", "dinner", "vegetable", "vegetarian"], image:null, verified:false },
  { id:"haricots-verts", name:"Haricots verts", category:"legumes", additionalCategories:[], kcal:31, protein:1.8, carbs:7, fat:0.2, nutritionBasis:"100 g crus", referenceState:"cru", tags:["lunch", "dinner", "vegetable", "vegetarian"], image:null, verified:false },
  { id:"courgettes", name:"Courgettes", category:"legumes", additionalCategories:[], kcal:17, protein:1.2, carbs:3.1, fat:0.3, nutritionBasis:"100 g crus", referenceState:"cru", tags:["lunch", "dinner", "vegetable", "vegetarian"], image:null, verified:false },
  { id:"concombre", name:"Concombre", category:"legumes", additionalCategories:[], kcal:15, protein:0.7, carbs:3.6, fat:0.1, nutritionBasis:"100 g crus", referenceState:"cru", tags:["lunch", "dinner", "vegetable", "vegetarian"], image:null, verified:false },
  { id:"poivrons", name:"Poivrons", category:"legumes", additionalCategories:[], kcal:31, protein:1, carbs:6, fat:0.3, nutritionBasis:"100 g crus", referenceState:"cru", tags:["lunch", "dinner", "vegetable", "vegetarian"], image:null, verified:false },
  { id:"epinards", name:"\u00c9pinards", category:"legumes", additionalCategories:[], kcal:23, protein:2.9, carbs:3.6, fat:0.4, nutritionBasis:"100 g crus", referenceState:"cru", tags:["lunch", "dinner", "vegetable", "vegetarian"], image:null, verified:false },
  { id:"carottes", name:"Carottes", category:"legumes", additionalCategories:[], kcal:41, protein:0.9, carbs:10, fat:0.2, nutritionBasis:"100 g crues", referenceState:"cru", tags:["lunch", "dinner", "vegetable", "vegetarian"], image:null, verified:false },
  { id:"tomates", name:"Tomates", category:"legumes", additionalCategories:[], kcal:18, protein:0.9, carbs:3.9, fat:0.2, nutritionBasis:"100 g crues", referenceState:"cru", tags:["lunch", "dinner", "vegetable", "vegetarian"], image:null, verified:false },
  { id:"champignons", name:"Champignons", category:"legumes", additionalCategories:[], kcal:22, protein:3.1, carbs:3.3, fat:0.3, nutritionBasis:"100 g crus", referenceState:"cru", tags:["lunch", "dinner", "vegetable", "vegetarian"], image:null, verified:false },
  { id:"petits-pois", name:"Petits pois", category:"legumes", additionalCategories:["glucides"], kcal:81, protein:5.4, carbs:14, fat:0.4, nutritionBasis:"100 g crus", referenceState:"cru", tags:["lunch", "dinner", "vegetable", "vegetarian"], image:null, verified:false },
  { id:"salade", name:"Salade verte", category:"legumes", additionalCategories:[], kcal:15, protein:1.4, carbs:2.9, fat:0.2, nutritionBasis:"100 g crue", referenceState:"cru", tags:["lunch", "dinner", "vegetable", "vegetarian"], image:null, verified:false }
];
