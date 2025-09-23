# Guide complet pour configurer AWS S3 pour les backups

## 🎯 Objectif

Configurer AWS S3 pour stocker automatiquement les backups de votre application et assurer la récupération des données en cas de crash de la base de données.

## 📋 Étapes pour obtenir les clés AWS

### 1. Créer un compte AWS

1. Aller sur [aws.amazon.com](https://aws.amazon.com)
2. Cliquer sur "Créer un compte AWS"
3. Suivre les instructions (carte de crédit requise mais niveau gratuit disponible)
4. Vérifier votre identité par téléphone

### 2. Accéder à la console AWS

1. Se connecter à [console.aws.amazon.com](https://console.aws.amazon.com)
2. Sélectionner votre région préférée (ex: `us-east-1` ou `eu-west-3` pour l'Europe)

### 3. Créer un utilisateur IAM pour l'application

1. Dans la console AWS, chercher "IAM" dans la barre de recherche
2. Cliquer sur "Users" (Utilisateurs) dans le menu de gauche
3. Cliquer sur "Create user" (Créer un utilisateur)
4. Entrer un nom d'utilisateur : `app-gestion-backup-user`
5. **Important**: Ne pas cocher "Provide user access to the AWS Management Console"

### 4. Attacher les permissions S3

1. Dans l'étape "Set permissions", sélectionner "Attach policies directly"
2. Chercher et sélectionner la politique : `AmazonS3FullAccess`
   - **Note**: Pour plus de sécurité en production, créer une politique personnalisée (voir section sécurité)
3. Cliquer sur "Next" puis "Create user"

### 5. Créer les clés d'accès

1. Cliquer sur l'utilisateur créé
2. Aller dans l'onglet "Security credentials"
3. Descendre à la section "Access keys"
4. Cliquer sur "Create access key"
5. Sélectionner "Application running outside AWS"
6. Cocher la case de confirmation et cliquer "Next"
7. Optionnel: Ajouter une description "Backup automatique App Gestion"
8. Cliquer sur "Create access key"

### 6. Sauvegarder les clés (IMPORTANT!)

```
Access Key ID: AKIA... (commence toujours par AKIA)
Secret Access Key: ... (chaîne longue et complexe)
```

⚠️ **ATTENTION**: Télécharger le fichier CSV ou copier ces clés immédiatement car elles ne seront plus jamais affichées!

### 7. Créer un bucket S3

1. Dans la console AWS, chercher "S3"
2. Cliquer sur "Create bucket"
3. Nom du bucket: `app-gestion-backups-[votre-nom]` (doit être unique mondialement)
4. Région: Choisir la même que votre app (ex: `us-east-1`)
5. Laisser les autres paramètres par défaut
6. Cliquer sur "Create bucket"

## 🔒 Configuration de sécurité recommandée

### Politique IAM personnalisée (Plus sécurisée)

Au lieu de `AmazonS3FullAccess`, créer une politique personnalisée :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::app-gestion-backups-votre-nom/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::app-gestion-backups-votre-nom"
    }
  ]
}
```

## 📁 Configuration dans votre application

### 1. Créer le fichier .env.local

```bash
# Variables AWS - Remplacer par vos vraies valeurs
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=app-gestion-backups-votre-nom
```

### 2. Pour la production (Deno Deploy)

Ajouter ces variables dans les paramètres de votre projet Deno Deploy :

1. Aller dans votre projet Deno Deploy
2. Settings → Environment Variables
3. Ajouter les 4 variables AWS

### 3. Pour GitHub Actions

Ajouter ces secrets dans votre repo GitHub :

1. GitHub repo → Settings → Secrets and variables → Actions
2. Ajouter chaque variable comme secret

## 💰 Coûts AWS S3

### Niveau gratuit AWS (12 premiers mois)

- 5 GB de stockage Standard S3
- 20,000 requêtes GET
- 2,000 requêtes PUT, COPY, POST, LIST

### Coûts après le niveau gratuit

- Stockage Standard : ~$0.023 per GB/mois
- Stockage Infrequent Access : ~$0.0125 per GB/mois (recommandé pour backups)
- Requêtes PUT : ~$0.0005 per 1,000 requêtes

**Estimation pour votre app :**

- 10 compagnies × 5MB par backup × 12 mois = 600MB/an
- Coût annuel estimé : < $1 USD

## 🧪 Test de la configuration

Après avoir configuré les clés, tester avec :

```bash
# Dans votre terminal
npm run dev
```

Puis aller sur `/superadmin/backup` et cliquer sur "Tester AWS S3".

## 🔍 Vérification des clés

Vous pouvez vérifier que vos clés fonctionnent avec cette commande test :

```bash
aws s3 ls s3://votre-bucket-name --region us-east-1
```

## ⚠️ Sécurité importante

1. **Ne jamais commiter les clés AWS dans Git**
2. **Utiliser des variables d'environnement**
3. **Faire tourner les clés régulièrement (tous les 90 jours)**
4. **Surveiller l'utilisation dans AWS CloudTrail**
5. **Activer l'authentification à deux facteurs sur votre compte AWS**

## 🆘 En cas de problème

1. **Clés invalides**: Vérifier qu'elles sont bien copiées sans espaces
2. **Bucket introuvable**: Vérifier le nom et la région
3. **Permissions refusées**: Vérifier que la politique IAM est correcte
4. **Support**: Contacter le support AWS (niveau gratuit disponible)

## 📞 Alternatives si vous ne voulez pas AWS

Si vous préférez éviter AWS, nous pouvons configurer :

- Google Cloud Storage
- DigitalOcean Spaces
- Cloudflare R2
- Stockage local avec synchronisation

Dites-moi si vous avez besoin d'aide pour l'une de ces alternatives !
