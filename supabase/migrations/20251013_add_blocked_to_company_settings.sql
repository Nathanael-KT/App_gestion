-- Ajout du champ blocked à la table company_settings
ALTER TABLE public.company_settings
ADD COLUMN blocked boolean DEFAULT false;
