# 🛡️ Guide de Récupération des Données - App Gestion

## 📋 Vue d'ensemble

Ce guide explique comment récupérer vos données en cas de crash de la base de données grâce au système de sauvegarde automatique mensuelle intégré.

## 🔄 Système de Sauvegarde Automatique

### Fonctionnement

- **Fréquence** : Le 1er de chaque mois à 2h00 du matin
- **Contenu** : Toutes les données de toutes les compagnies
- **Format** : Fichiers Excel (.xlsx) séparés par compagnie
- **Stockage** : Local + sauvegarde cloud automatique
- **Rétention** : 12 mois d'historique

### Tables Sauvegardées

njdcnskjlbsbcsbjkc


✅ **Données Utilisateurs**

- `users` - Comptes utilisateurs
- `company_settings` - Paramètres des compagnies

✅ **Données Produits & Stock**

- `products_carreaux` - Catalogue produits
- `product_types` - Types de produits
- `stocks` - Inventaire

✅ **Données Clients & Ventes**

- `clients` - Base clients
- `invoices` - Factures
- `invoice_items` - Détails des factures
- `payments` - Paiements

✅ **Données Magasins**

- `magasins` - Magasins/Points de vente
- `cash_counts` - Comptages de caisse
- `cash_emptying` - Vidanges de caisse
- `cash_transactions` - Transactions
- `daily_closings` - Clôtures journalières

✅ **Communication**

- `forum_messages` - Messages du forum

## 🚨 Procédure de Récupération d'Urgence

### Étape 1 : Accéder aux Sauvegardes

1. Connectez-vous en tant que **Superadmin**
2. Allez dans **Backup des Données**
3. Section **"Sauvegarde Automatique"**
4. Consultez l'**"Historique des Sauvegardes Automatiques"**

### Étape 2 : Identifier la Sauvegarde

- Sélectionnez la sauvegarde la plus récente avec le statut **"Réussi"**
- Vérifiez la date et le nombre de compagnies sauvegardées
- Cliquez sur **"Récupérer"** pour télécharger

### Étape 3 : Restauration des Données

1. **Préparation de la nouvelle base**

   ```sql
   -- Recréer la structure de base
   CREATE DATABASE app_gestion_restored;
   ```

2. **Import des données Excel**

   - Utilisez un outil comme DBeaver ou pgAdmin
   - Importez chaque fichier Excel dans les tables correspondantes
   - Respectez l'ordre : compagnies → magasins → utilisateurs → produits → clients → factures

3. **Vérification de l'intégrité**
   ```sql
   -- Vérifier le nombre d'enregistrements
   SELECT COUNT(*) FROM companies;
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM products_carreaux;
   ```

## 🔧 Configuration Avancée

### Activation/Désactivation

```javascript
// Dans l'interface superadmin
const autoBackupEnabled = true; // Active la sauvegarde auto
```

### Programmation Personnalisée

Le système utilise un scheduler JavaScript qui vérifie toutes les heures si c'est le moment d'effectuer une sauvegarde.

### Stockage Cloud (Recommandé)

Pour une protection maximale, configurez un stockage cloud :

- **AWS S3** : Sauvegarde automatique vers S3
- **Google Drive** : Synchronisation automatique
- **Dropbox Business** : Backup vers Dropbox

## 📊 Surveillance & Alertes

### Notifications de Réussite

- ✅ Toast notification en cas de succès
- 📧 Email de confirmation (optionnel)
- 📱 Notification push (optionnel)

### Gestion des Échecs

- ❌ Alerte immédiate en cas d'échec
- 🔄 Tentative de reprise automatique après 1h
- 📞 Notification d'urgence après 3 échecs consécutifs

## 🛠️ Dépannage

### Problème : "Backup automatique non exécuté"

**Solution :**

1. Vérifiez que le toggle est activé
2. Redémarrez l'application
3. Vérifiez les logs du navigateur (F12)

### Problème : "Fichiers corrompus"

**Solution :**

1. Utilisez la sauvegarde du mois précédent
2. Vérifiez l'intégrité avec Excel/LibreOffice
3. Contactez le support technique

### Problème : "Données manquantes après restauration"

**Solution :**

1. Vérifiez que toutes les tables ont été importées
2. Respectez l'ordre d'importation (contraintes de clés)
3. Recréez les index et contraintes

## 🔐 Sécurité

### Chiffrement

- Fichiers Excel protégés par mot de passe (optionnel)
- Transmission sécurisée HTTPS
- Stockage local chiffré

### Accès Restreint

- Seuls les **Superadmins** peuvent gérer les sauvegardes
- Logs d'audit de tous les accès
- Authentification à double facteur recommandée

## 📞 Support d'Urgence

En cas de perte de données critique :

1. **Ne pas paniquer** - Vos données sont sauvegardées !
2. **Contacter immédiatement** l'équipe technique
3. **Fournir** : Date du crash, dernière sauvegarde connue
4. **Attendre** les instructions avant toute manipulation

---

### 💡 Bonnes Pratiques

✅ **À FAIRE**

- Vérifier mensuellement que la sauvegarde fonctionne
- Tester la restauration sur un environnement de test
- Maintenir une sauvegarde locale ET cloud
- Former plusieurs administrateurs à la procédure

❌ **À ÉVITER**

- Désactiver la sauvegarde automatique
- Supprimer les anciens backups manuellement
- Négliger les notifications d'échec
- Modifier la structure des fichiers Excel

---

**Dernière mise à jour** : 22 septembre 2025
**Version du système** : 1.0.0
**Responsable** : Équipe Technique App Gestion
