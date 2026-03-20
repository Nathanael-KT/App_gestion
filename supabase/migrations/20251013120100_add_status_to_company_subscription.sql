-- Ajout du champ status à la table company_subscription
ALTER TABLE public.company_subscription
ADD COLUMN status text DEFAULT 'actif';

-- Pour les nouveaux abonnements, status = 'actif' par défaut
-- Valeurs possibles : 'actif', 'en_attente', 'bloque'
