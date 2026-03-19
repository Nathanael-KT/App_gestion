-- Migration pour implémenter la sécurité multi-tenant avec Row Level Security (RLS)

-- Créer une fonction pour obtenir l'ID de l'entreprise de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_company_id uuid;
BEGIN
  -- Si c'est un accès service_role, bloquer par défaut
  IF auth.role() = 'service_role' THEN
    -- Permettre seulement si une variable spéciale est définie
    IF current_setting('app.bypass_rls', true) = 'true' THEN
      RETURN null; -- Permet l'accès total uniquement si explicitement autorisé
    ELSE
      RAISE EXCEPTION 'Accès service_role non autorisé sans bypass explicite';
    END IF;
  END IF;

  SELECT company_id INTO user_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid();
  
  RETURN user_company_id;
END;
$$;

-- Fonction pour vérifier si l'utilisateur est admin (pour certaines opérations)
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_roles text[];
BEGIN
  -- Bloquer les accès service_role sauf bypass explicite
  IF auth.role() = 'service_role' AND current_setting('app.bypass_rls', true) != 'true' THEN
    RAISE EXCEPTION 'Accès administrateur non autorisé sans bypass explicite';
  END IF;

  SELECT roles INTO user_roles
  FROM public.users
  WHERE auth_user_id = auth.uid();
  
  RETURN 'admin' = ANY(user_roles) OR 'super_admin' = ANY(user_roles);
END;
$$;

-- Activer RLS sur toutes les tables sensibles
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE magasins ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_carreaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_emptying ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy pour company_settings
DROP POLICY IF EXISTS "Users can only access their company settings" ON company_settings;
CREATE POLICY "Users can only access their company settings" ON company_settings
  FOR ALL USING (id = public.get_user_company_id());

-- RLS Policy pour users
DROP POLICY IF EXISTS "Users can access users from their company" ON users;
CREATE POLICY "Users can access users from their company" ON users
  FOR ALL USING (company_id = public.get_user_company_id() OR auth_user_id = auth.uid());

-- RLS Policy pour magasins
DROP POLICY IF EXISTS "Users can access magasins from their company" ON magasins;
CREATE POLICY "Users can access magasins from their company" ON magasins
  FOR ALL USING (company_id = public.get_user_company_id());

-- RLS Policy pour clients
DROP POLICY IF EXISTS "Users can access clients from their company magasins" ON clients;
CREATE POLICY "Users can access clients from their company magasins" ON clients
  FOR ALL USING (
    magasin_id IN (
      SELECT id FROM magasins WHERE company_id = public.get_user_company_id()
    )
  );

-- RLS Policy pour products_carreaux
DROP POLICY IF EXISTS "Users can access products from their company" ON products_carreaux;
CREATE POLICY "Users can access products from their company" ON products_carreaux
  FOR ALL USING (company_id = public.get_user_company_id());

-- RLS Policy pour product_types
DROP POLICY IF EXISTS "Users can access product types from their company" ON product_types;
CREATE POLICY "Users can access product types from their company" ON product_types
  FOR ALL USING (company_id = public.get_user_company_id());

-- RLS Policy pour stocks
DROP POLICY IF EXISTS "Users can access stocks from their company" ON stocks;
CREATE POLICY "Users can access stocks from their company" ON stocks
  FOR ALL USING (company_id = public.get_user_company_id());

-- RLS Policy pour invoices
DROP POLICY IF EXISTS "Users can access invoices from their company magasins" ON invoices;
CREATE POLICY "Users can access invoices from their company magasins" ON invoices
  FOR ALL USING (
    magasin_id IN (
      SELECT id FROM magasins WHERE company_id = public.get_user_company_id()
    )
  );

-- RLS Policy pour invoice_items
DROP POLICY IF EXISTS "Users can access invoice items from their company magasins" ON invoice_items;
CREATE POLICY "Users can access invoice items from their company magasins" ON invoice_items
  FOR ALL USING (
    magasin_id IN (
      SELECT id FROM magasins WHERE company_id = public.get_user_company_id()
    )
  );

-- RLS Policy pour payments
DROP POLICY IF EXISTS "Users can access payments from their company" ON payments;
CREATE POLICY "Users can access payments from their company" ON payments
  FOR ALL USING (company_id = public.get_user_company_id());

-- RLS Policy pour cash_transactions
DROP POLICY IF EXISTS "Users can access cash transactions from their company magasins" ON cash_transactions;
CREATE POLICY "Users can access cash transactions from their company magasins" ON cash_transactions
  FOR ALL USING (
    magasin_id IN (
      SELECT id FROM magasins WHERE company_id = public.get_user_company_id()
    )
  );

-- RLS Policy pour cash_counts
DROP POLICY IF EXISTS "Users can access cash counts from their company magasins" ON cash_counts;
CREATE POLICY "Users can access cash counts from their company magasins" ON cash_counts
  FOR ALL USING (
    magasin_id IN (
      SELECT id FROM magasins WHERE company_id = public.get_user_company_id()
    )
  );

-- RLS Policy pour cash_emptying
DROP POLICY IF EXISTS "Users can access cash emptying from their company magasins" ON cash_emptying;
CREATE POLICY "Users can access cash emptying from their company magasins" ON cash_emptying
  FOR ALL USING (
    magasin_id IN (
      SELECT id FROM magasins WHERE company_id = public.get_user_company_id()
    )
  );

-- RLS Policy pour daily_closings
DROP POLICY IF EXISTS "Users can access daily closings from their company magasins" ON daily_closings;
CREATE POLICY "Users can access daily closings from their company magasins" ON daily_closings
  FOR ALL USING (
    magasin_id IN (
      SELECT id FROM magasins WHERE company_id = public.get_user_company_id()
    )
  );

-- RLS Policy pour forum_messages
DROP POLICY IF EXISTS "Users can access forum messages from their company" ON forum_messages;
CREATE POLICY "Users can access forum messages from their company" ON forum_messages
  FOR ALL USING (company_id = public.get_user_company_id());

-- RLS Policy pour company_subscription
DROP POLICY IF EXISTS "Users can access their company subscription" ON company_subscription;
CREATE POLICY "Users can access their company subscription" ON company_subscription
  FOR ALL USING (company_id = public.get_user_company_id());

-- Politique spéciale pour les super_admins (peuvent tout voir)
DROP POLICY IF EXISTS "super_admins can access all data" ON company_settings;
CREATE POLICY "super_admins can access all data" ON company_settings
  FOR ALL USING (public.is_user_admin());

-- Créer des index pour améliorer les performances des RLS
CREATE INDEX IF NOT EXISTS idx_users_company_id_auth ON users(company_id, auth_user_id);
CREATE INDEX IF NOT EXISTS idx_magasins_company_id ON magasins(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_magasin_company ON clients(magasin_id);
CREATE INDEX IF NOT EXISTS idx_invoices_magasin_company ON invoices(magasin_id);

-- Fonction pour attribuer automatiquement le company_id lors de l'insertion
CREATE OR REPLACE FUNCTION auto_assign_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si company_id n'est pas défini, l'attribuer automatiquement
  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.get_user_company_id();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Appliquer le trigger aux tables appropriées
DROP TRIGGER IF EXISTS auto_assign_company_id_trigger ON products_carreaux;
CREATE TRIGGER auto_assign_company_id_trigger
  BEFORE INSERT ON products_carreaux
  FOR EACH ROW EXECUTE FUNCTION auto_assign_company_id();

DROP TRIGGER IF EXISTS auto_assign_company_id_trigger ON product_types;
CREATE TRIGGER auto_assign_company_id_trigger
  BEFORE INSERT ON product_types
  FOR EACH ROW EXECUTE FUNCTION auto_assign_company_id();

DROP TRIGGER IF EXISTS auto_assign_company_id_trigger ON stocks;
CREATE TRIGGER auto_assign_company_id_trigger
  BEFORE INSERT ON stocks
  FOR EACH ROW EXECUTE FUNCTION auto_assign_company_id();

DROP TRIGGER IF EXISTS auto_assign_company_id_trigger ON payments;
CREATE TRIGGER auto_assign_company_id_trigger
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION auto_assign_company_id();

DROP TRIGGER IF EXISTS auto_assign_company_id_trigger ON forum_messages;
CREATE TRIGGER auto_assign_company_id_trigger
  BEFORE INSERT ON forum_messages
  FOR EACH ROW EXECUTE FUNCTION auto_assign_company_id();

-- Commentaires pour documentation
COMMENT ON FUNCTION public.get_user_company_id() IS 'Retourne l''ID de l''entreprise de l''utilisateur connecté pour RLS';
COMMENT ON FUNCTION public.is_user_admin() IS 'Vérifie si l''utilisateur connecté est admin/super_admin';
COMMENT ON FUNCTION auto_assign_company_id() IS 'Attribue automatiquement le company_id lors de l''insertion';
