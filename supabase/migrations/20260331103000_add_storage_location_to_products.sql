-- Add storage location for each product in stock management.
ALTER TABLE public.products_carreaux
ADD COLUMN IF NOT EXISTS storage_location text;
