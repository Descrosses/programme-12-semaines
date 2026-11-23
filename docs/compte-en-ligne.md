# Compte en ligne — mise en route (lot 1)

Ce que fait le lot 1 : un compte **facultatif** (connexion par code reçu par
e-mail, sans mot de passe), une **sauvegarde automatique** après chaque séance
terminée et une fois par jour à l'ouverture de l'appli, et « Restaurer depuis
mon compte » sur un nouveau téléphone. Les photos et vidéos ne partent jamais.

Tant que les deux valeurs de `src/cloud/config.ts` sont vides, rien de tout
cela n'apparaît : l'appli reste 100 % locale, comme avant.

---

## Ce que Guillaume fait (une fois, ~15 minutes)

### 1. Créer le projet

1. Créer un compte sur <https://supabase.com> (gratuit).
2. **New project** :
   - nom : `dcross-fit` (ou ce que tu veux) ;
   - mot de passe de la base : en générer un et le garder dans ton
     gestionnaire de mots de passe (l'appli n'en a pas besoin) ;
   - **région : Central EU (Frankfurt)** — les données restent en Europe ;
   - plan : **Free**.

### 2. Coller le script

**SQL Editor** → **New query** → coller tout le contenu de
`supabase/setup.sql` → **Run**. Résultat attendu : « Success. No rows
returned ».

Ce script crée le dossier privé des sauvegardes et la règle « chacun ne voit
que son propre dossier ».

### 3. Faire envoyer un CODE, pas un lien

**Authentication** → **Emails** → **Templates**. Dans les deux modèles
**Confirm signup** et **Magic Link**, remplacer le corps par :

```html
<h2>Ton code de connexion</h2>
<p>Saisis ce code dans l’appli :</p>
<p style="font-size: 28px; font-weight: bold; letter-spacing: 4px">{{ .Token }}</p>
<p>Il expire dans une heure. Si tu n’as rien demandé, ignore ce message.</p>
```

Pourquoi un code : sur iPhone, un lien ouvrirait Safari, pas l'appli
installée sur l'écran d'accueil.

### 4. Me donner deux valeurs

**Project Settings** → **API Keys** (ou **API**) :

- **Project URL** (`https://xxxx.supabase.co`) ;
- la clé **publishable** (`sb_publishable_…`, ou l'ancienne « anon public »).

Ces deux valeurs sont **publiques par conception** : elles finissent dans
l'appli installée sur chaque téléphone. Ce qui protège les données, ce sont
les règles du script de l'étape 2. **Ne jamais donner** la clé `secret` /
`service_role`, ni le mot de passe de la base.

---

## Avant d'ouvrir les comptes à d'autres personnes

Le service d'e-mail fourni par Supabase n'envoie de codes **qu'aux membres
de ton organisation Supabase** (toi), et environ deux par heure. Pour tes
essais, ça suffit. Pour d'autres utilisateurs, il faut brancher un service
d'envoi (SMTP) : Brevo ou Resend ont des offres gratuites, mais demandent en
général de vérifier un nom de domaine (≈ 10 €/an).
Réglage : **Authentication** → **Emails** → **SMTP Settings**.

## Les quotas du plan gratuit (vérifiés le 23 novembre 2026)

| Ressource | Gratuit | Ce qu'on en utilise |
|---|---|---|
| Stockage de fichiers | 1 Go | ~0,8 Mo par personne et par cycle de 12 semaines, × 2 (la précédente est gardée) |
| Base de données | 500 Mo | rien : les sauvegardes sont des fichiers |
| Comptes actifs / mois | 50 000 | — |
| Trafic sortant | 5 Go / mois | les restaurations seulement (le reste entre) |
| Mise en pause | après 7 jours sans aucune activité | une sauvegarde par jour d'utilisation suffit à la tenir éveillée |

Ordre de grandeur : **environ 600 personnes** avec un cycle complet chacune
avant d'atteindre 1 Go. Le plan payant (25 $/mois) n'a pas de mise en pause
et garde des sauvegardes quotidiennes du projet lui-même — à envisager
quand d'autres personnes dépendront du compte.

Une limite à connaître : le plan gratuit **ne sauvegarde pas le projet
lui-même**. Si Supabase perdait le projet, les copies en ligne seraient
perdues — mais chaque téléphone garde toujours ses propres données.
