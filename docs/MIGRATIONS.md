# 🗄️ Guide des Migrations Supabase

Ce document explique comment les migrations sont appliquées à la base de données en ligne
(production) — en mode automatique (CI/CD) et en **mode manuel**, et comment vérifier /
réparer l'historique.

> **Rappel clé** : appliquer des migrations **n'efface pas** les données de production.
> `supabase db push` est une opération **non destructive** : il n'applique que les
> migrations en attente (voir ⚠️ « push ≠ reset » plus bas).

---

## 1. Où sont les migrations ?

```
supabase/
├── config.toml               # Lien vers le projet Supabase (project_ref)
├── migrations/               # ← Tous les fichiers SQL, triés par ordre d'application
│   ├── 20260325000000_squashed_schema.sql
│   ├── 20260821090000_stripe_subscriptions.sql
│   └── ...
└── seed.sql                  # Données de test (local uniquement)
```

- Chaque fichier est nommé `<timestamp>_<description>.sql` (ordre d'application = ordre des timestamps).
- L'état d'application est tracé côté base dans la table
  **`supabase_migrations.schema_migrations`** (version + date d'application).
- Une migration déjà tracée **n'est jamais réappliquée**.

---

## 2. Mode normal : application automatique (CI/CD)

Lors d'un **merge sur `main`**, le job `Database Migration` du workflow
`.github/workflows/deploy.yml` :

1. détecte les nouveaux fichiers `supabase/migrations/*.sql` du push,
2. exécute `supabase db push` (CLI officielle) → applique **toutes** les migrations
   en attente et les trace dans `schema_migrations`,
3. le déploiement de l'application n'a lieu qu'après.

> ℹ️ Depuis la correction de l'issue #90, ce job est **indépendant des tests/lint** :
> un échec de test ne bloque plus l'application des migrations.

### Secrets GitHub requis (Settings → Secrets and variables → Actions)

| Secret | Valeur |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Token personnel Supabase (Dashboard → votre avatar → Access Tokens), avec droits sur le projet |
| `SUPABASE_PROJECT_ID` | Référence du projet (ex : `abcdefg` dans `https://abcdefg.supabase.co`) |
| `SUPABASE_DB_PASSWORD` | Mot de passe `postgres` du projet (Dashboard → Project Settings → Database) |

### ⚠️ Si la CI ne tourne pas (ex : compte verrouillé pour billing)

Le merge se fait quand même (pas de protection de branche), mais **rien ne s'exécute**.
→ Utilisez la procédure manuelle ci-dessous.

---

## 3. ⚡ Mode manuel : appliquer les migrations à la base en ligne

À utiliser quand la CI est indisponible, ou pour forcer une synchro.
**Toutes les données de production sont conservées.**

### Prérequis

```bash
git checkout main && git pull        # ← IMPORTANT : avoir les derniers fichiers de migration
pnpm install                         # installe la CLI supabase (déjà en devDependency)
```

### Commandes

```bash
# 1. Connexion à votre compte Supabase
npx supabase login --token <SUPABASE_ACCESS_TOKEN>

# 2. Lier le dépôt au projet en ligne
#    (modifie supabase/config.toml : ajoute project_ref — sans secret)
npx supabase link --project-ref <SUPABASE_PROJECT_ID>

# 3. (Optionnel mais recommandé) Aperçu des migrations qui seraient appliquées
npx supabase db push --linked --dry-run --password <SUPABASE_DB_PASSWORD>

# 4. Application de TOUTES les migrations en attente
npx supabase db push --linked --password <SUPABASE_DB_PASSWORD>
```

Où trouver chaque valeur :

| Paramètre | Où le trouver |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase Dashboard → avatar → **Access Tokens** → *New token* (permissions : *projects: read* minimum) — ou le secret GitHub si déjà configuré |
| `SUPABASE_PROJECT_ID` | URL du projet : `https://<SUPABASE_PROJECT_ID>.supabase.co` |
| `SUPABASE_DB_PASSWORD` | Supabase Dashboard → **Project Settings → Database → Password** |

> 💡 Alternative en une commande (sans modifier `config.toml`) :
> ```bash
> npx supabase login --token <SUPABASE_ACCESS_TOKEN>
> npx supabase db push --project-ref <SUPABASE_PROJECT_ID> --password <SUPABASE_DB_PASSWORD>
> ```
> (le flag `--project-ref` peut remplacer `--linked` sur toutes les commandes ci-dessous)

### Exemple de sortie attendue

```
Applying migration "20260821090000_stripe_subscriptions.sql" ... ✅
Applying migration "20260821100000_fix_subscription_plans_grants.sql" ... ✅
Applying migration "20260821110000_fix_rls_superadmin_and_connection.sql" ... ✅
No migrations to apply.
```

Si rien n'est à faire : `No migrations to apply.` → la base est déjà à jour.

---

## 4. ✅ Vérifier que la base est à jour

### Option A — relancer le push (le plus simple)

```bash
npx supabase db push --linked --password <SUPABASE_DB_PASSWORD>
# → doit répondre : "No migrations to apply."
```

### Option B — requête SQL dans le Supabase Dashboard (SQL Editor)

```sql
SELECT version, applied_at
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

→ la dernière version affichée doit correspondre au **dernier fichier** de
`supabase/migrations/` (ex : `20260821110000`).

### Option C — diff entre le dépôt et la base

```bash
npx supabase db diff --linked --password <SUPABASE_DB_PASSWORD>
# → affiche le SQL manquant entre le dépôt et la base (vide = à jour)
```

---

## 5. ⚠️ « push » ≠ « reset » — ne pas confondre !

| Commande | Cible | Effet |
|---|---|---|
| `supabase db push` | **En ligne** (ou local) | Applique les migrations en attente. **Non destructif** : aucune donnée perdue. ✅ C'est la bonne commande. |
| `supabase db reset` | **Local uniquement** | **Destructe** la base locale puis la re-crée avec toutes les migrations + seed. Ne jamais le viser vers la production. |
| Reset du projet (Dashboard) | **En ligne** | **Destructible totale de la base en production** (toutes les données perdues, irréversible). Supabase Dashboard → Project Settings → Database → *Reset*. À n'utiliser qu'en dernier recours. |

**Il n'existe pas de commande « reset la base en ligne avec les migrations »** —
le bon réflexe est `supabase db push`, qui amène la base en ligne à l'état exact
du dépôt **sans toucher aux données**.

> 🚨 Si un reset total de production était vraiment nécessaire : sauvegardez d'abord
> (voir `BACKUP_RECOVERY_GUIDE.md`), puis Dashboard → Reset, puis
> `npx supabase db push` pour réappliquer tout le schéma.

---

## 6.  Réparer un historique incohérent

Symptômes : `supabase db push` échoue avec des erreurs du type
`migration "..." not found`, `already applied`, `schema drift`, ou le CLI refuse
de continuer.

### 6.1 Marquer d'anciennes versions comme révoquées

Lorsque des migrations ont été appliquées manuellement ou supprimées du dépôt
(cas historique de ce projet : migrations squashed dans
`20260325000000_squashed_schema.sql`), il faut réaligner l'historique :

```bash
npx supabase migration repair --linked --status reverted <version1> <version2> ... \
  --password <SUPABASE_DB_PASSWORD>
```

### 6.2 Workflow manuel GitHub (quand la CI est de nouveau fonctionnelle)

Le workflow **`Supabase Repair And Push`** (`.github/workflows/supabase-repair-and-push.yml`)
effectue cette réparation + le push en un clic :

1. GitHub → *Actions* → *Supabase Repair And Push* → *Run workflow*,
2. saisir `RESET_REMOTE_PUBLIC` pour confirmer.

> ⚠️ Ce workflow fait partie de GitHub Actions : il ne tourne que si le compte
> GitHub n'est plus verrouillé (billing) et que les 3 secrets sont présents.

---

## 7. 📋 Checklist « une migration vient d'être merge, tout est bon ? »

- [ ] Le job `Database Migration` est en ✅ sur le run CI du merge (ou `supabase db push` exécuté manuellement)
- [ ] `No migrations to apply.` au prochain `supabase db push`
- [ ] La requête SQL de la section 4 montre la dernière version du dépôt
- [ ] L'application en ligne fonctionne (les nouvelles colonnes/tables sont visibles)
