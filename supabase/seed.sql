-- Donnees de demarrage (fictives) pour un environnement neuf.
-- Ce seed est idempotent: il peut etre relance sans dupliquer les donnees.

BEGIN;

-- 1) Entreprise et abonnement
INSERT INTO public.company_settings (
  id,
  company_name,
  company_email,
  company_phone,
  company_address,
  company_website,
  company_siret,
  currency,
  tax_rate,
  invoice_prefix,
  invoice_number_start,
  low_stock_threshold,
  critical_stock_threshold,
  blocked,
  blocked_menus
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Gestion Demo SARL',
  'contact@gestion-demo.local',
  '+229 90 00 00 01',
  'Akpakpa, Cotonou, Benin',
  'https://gestion-demo.local',
  'RCCM-BJ-2026-A-10001',
  'EUR',
  18.00,
  'FAC-',
  1000,
  15,
  6,
  false,
  ARRAY[]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  company_name = EXCLUDED.company_name,
  company_email = EXCLUDED.company_email,
  company_phone = EXCLUDED.company_phone,
  company_address = EXCLUDED.company_address,
  company_website = EXCLUDED.company_website,
  company_siret = EXCLUDED.company_siret,
  blocked = EXCLUDED.blocked;

INSERT INTO public.company_subscription (
  id,
  company_id,
  is_paid,
  status,
  next_due_date,
  last_payment_date
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  true,
  'actif',
  CURRENT_DATE + INTERVAL '30 days',
  CURRENT_DATE
)
ON CONFLICT (id) DO UPDATE
SET
  is_paid = EXCLUDED.is_paid,
  status = EXCLUDED.status,
  next_due_date = EXCLUDED.next_due_date,
  last_payment_date = EXCLUDED.last_payment_date;

-- 2) Magasins
INSERT INTO public.magasins (id, nom, adresse, telephone, email, company_id)
VALUES
  (
    '33333333-3333-3333-3333-333333333331',
    'Magasin Cotonou Centre',
    'Rue 1200, Cotonou',
    '+229 90 00 10 01',
    'centre@gestion-demo.local',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    'Magasin Porto-Novo',
    'Avenue du Marche, Porto-Novo',
    '+229 90 00 10 02',
    'porto@gestion-demo.local',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO UPDATE
SET
  nom = EXCLUDED.nom,
  adresse = EXCLUDED.adresse,
  telephone = EXCLUDED.telephone,
  email = EXCLUDED.email;

-- 3) Utilisateurs metier
INSERT INTO public.users (id, name, email, roles, magasin_id, company_id)
VALUES
  (
    '44444444-4444-4444-4444-444444444441',
    'Admin Demo',
    'admin@gestion-demo.local',
    ARRAY['admin']::text[],
    '33333333-3333-3333-3333-333333333331',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    'Caissier Centre',
    'caisse.centre@gestion-demo.local',
    ARRAY['employe']::text[],
    '33333333-3333-3333-3333-333333333331',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '44444444-4444-4444-4444-444444444443',
    'Responsable Porto',
    'responsable.porto@gestion-demo.local',
    ARRAY['manager']::text[],
    '33333333-3333-3333-3333-333333333332',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  roles = EXCLUDED.roles,
  magasin_id = EXCLUDED.magasin_id,
  company_id = EXCLUDED.company_id;

-- 4) Types de produits
INSERT INTO public.product_types (id, name, company_id)
VALUES
  ('TYPE-CARREAUX', 'Carreaux', '11111111-1111-1111-1111-111111111111'),
  ('TYPE-COLLE', 'Colle', '11111111-1111-1111-1111-111111111111'),
  ('TYPE-ACCESSOIRES', 'Accessoires', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  company_id = EXCLUDED.company_id;

-- 5) Produits
INSERT INTO public.products_carreaux (
  id,
  name,
  description,
  price,
  stock,
  reference,
  type_produit,
  unite,
  company_id
)
VALUES
  (
    '55555555-5555-5555-5555-555555555551',
    'Carreau Blanc 60x60',
    'Carreau brillant usage interieur',
    12.50,
    450,
    'PRD-CAR-001',
    'TYPE-CARREAUX',
    'boite',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    'Carreau Gris Mat 30x30',
    'Carreau antiderapant usage exterieur',
    8.75,
    520,
    'PRD-CAR-002',
    'TYPE-CARREAUX',
    'boite',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '55555555-5555-5555-5555-555555555553',
    'Colle Forte 25kg',
    'Colle ciment haute adherence',
    6.90,
    180,
    'PRD-COL-001',
    'TYPE-COLLE',
    'sac',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '55555555-5555-5555-5555-555555555554',
    'Croisillons 2mm',
    'Sachet de 500 unites',
    2.20,
    300,
    'PRD-ACC-001',
    'TYPE-ACCESSOIRES',
    'sachet',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  reference = EXCLUDED.reference,
  type_produit = EXCLUDED.type_produit,
  unite = EXCLUDED.unite,
  company_id = EXCLUDED.company_id;

-- 6) Stock mouvement initial
INSERT INTO public.stocks (id, product_id, quantity, location, company_id)
VALUES
  (
    '66666666-6666-6666-6666-666666666661',
    '55555555-5555-5555-5555-555555555551',
    450,
    'Entree initiale - Cotonou Centre',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '55555555-5555-5555-5555-555555555552',
    520,
    'Entree initiale - Cotonou Centre',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO NOTHING;

-- 7) Clients
INSERT INTO public.clients (id, name, email, phone, address, magasin_id)
VALUES
  (
    '77777777-7777-7777-7777-777777777771',
    'Bati Plus SARL',
    'contact@batiplus.local',
    '+229 97 11 22 33',
    'Godomey, Abomey-Calavi',
    '33333333-3333-3333-3333-333333333331'
  ),
  (
    '77777777-7777-7777-7777-777777777772',
    'M. Kossi Agbo',
    'kossi.agbo@client.local',
    '+229 96 44 55 66',
    'Porto-Novo centre',
    '33333333-3333-3333-3333-333333333332'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  magasin_id = EXCLUDED.magasin_id;

-- 8) Factures
INSERT INTO public.invoices (
  id,
  client_id,
  date,
  total,
  status,
  reference,
  magasin_id,
  delivery,
  is_external
)
VALUES
  (
    '88888888-8888-8888-8888-888888888881',
    '77777777-7777-7777-7777-777777777771',
    CURRENT_DATE - INTERVAL '2 days',
    192.40,
    'paid',
    'FAC-1001',
    '33333333-3333-3333-3333-333333333331',
    false,
    false
  ),
  (
    '88888888-8888-8888-8888-888888888882',
    '77777777-7777-7777-7777-777777777772',
    CURRENT_DATE - INTERVAL '1 day',
    56.10,
    'partially_paid',
    'FAC-1002',
    '33333333-3333-3333-3333-333333333332',
    true,
    false
  )
ON CONFLICT (id) DO UPDATE
SET
  total = EXCLUDED.total,
  status = EXCLUDED.status,
  reference = EXCLUDED.reference,
  magasin_id = EXCLUDED.magasin_id,
  updated_at = NOW();

-- 9) Lignes de facture (respect de la contrainte chk_product_or_external)
INSERT INTO public.invoice_items (
  id,
  invoice_id,
  product_id,
  quantity,
  price,
  is_external,
  magasin_id
)
VALUES
  (
    '99999999-9999-9999-9999-999999999991',
    '88888888-8888-8888-8888-888888888881',
    '55555555-5555-5555-5555-555555555551',
    10,
    12.50,
    false,
    '33333333-3333-3333-3333-333333333331'
  ),
  (
    '99999999-9999-9999-9999-999999999992',
    '88888888-8888-8888-8888-888888888881',
    '55555555-5555-5555-5555-555555555553',
    6,
    6.90,
    false,
    '33333333-3333-3333-3333-333333333331'
  ),
  (
    '99999999-9999-9999-9999-999999999993',
    '88888888-8888-8888-8888-888888888882',
    '55555555-5555-5555-5555-555555555554',
    15,
    2.20,
    false,
    '33333333-3333-3333-3333-333333333332'
  ),
  (
    '99999999-9999-9999-9999-999999999994',
    '88888888-8888-8888-8888-888888888882',
    '55555555-5555-5555-5555-555555555553',
    3,
    6.90,
    false,
    '33333333-3333-3333-3333-333333333332'
  )
ON CONFLICT (id) DO UPDATE
SET
  quantity = EXCLUDED.quantity,
  price = EXCLUDED.price,
  magasin_id = EXCLUDED.magasin_id;

-- 10) Paiements
INSERT INTO public.payments (
  id,
  invoice_id,
  amount,
  payment_date,
  payment_method,
  reference,
  note,
  magasin_id,
  company_id
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '88888888-8888-8888-8888-888888888881',
    192.40,
    CURRENT_DATE - INTERVAL '2 days',
    'especes',
    'PAY-1001',
    'Paiement comptant',
    '33333333-3333-3333-3333-333333333331',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '88888888-8888-8888-8888-888888888882',
    30.00,
    CURRENT_DATE - INTERVAL '1 day',
    'virement',
    'PAY-1002',
    'Acompte',
    '33333333-3333-3333-3333-333333333332',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO UPDATE
SET
  amount = EXCLUDED.amount,
  payment_date = EXCLUDED.payment_date,
  payment_method = EXCLUDED.payment_method,
  reference = EXCLUDED.reference,
  note = EXCLUDED.note;

-- 11) Caisse et activite
INSERT INTO public.cash_transactions (
  id,
  type,
  amount,
  reason,
  source,
  recipient,
  note,
  created_by,
  magasin_id
)
VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'in',
    40.00,
    'Ajustement caisse',
    'Banque',
    'Caisse magasin',
    'Fond de caisse du matin',
    '44444444-4444-4444-4444-444444444442',
    '33333333-3333-3333-3333-333333333331'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'out',
    12.00,
    'Frais transport',
    'Caisse magasin',
    'Transporteur local',
    'Livraison client FAC-1002',
    '44444444-4444-4444-4444-444444444443',
    '33333333-3333-3333-3333-333333333332'
  )
ON CONFLICT (id) DO UPDATE
SET
  amount = EXCLUDED.amount,
  reason = EXCLUDED.reason,
  note = EXCLUDED.note,
  magasin_id = EXCLUDED.magasin_id;

INSERT INTO public.cash_counts (
  id,
  date,
  count_type,
  expected_amount,
  actual_amount,
  difference,
  note,
  counted_by,
  magasin_id
)
VALUES (
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  CURRENT_DATE,
  'closing',
  220.00,
  218.50,
  -1.50,
  'Petit ecart constate en cloture',
  '44444444-4444-4444-4444-444444444442',
  '33333333-3333-3333-3333-333333333331'
)
ON CONFLICT (id) DO UPDATE
SET
  expected_amount = EXCLUDED.expected_amount,
  actual_amount = EXCLUDED.actual_amount,
  difference = EXCLUDED.difference,
  note = EXCLUDED.note;

INSERT INTO public.daily_closings (
  id,
  date,
  opening_balance,
  total_sales_cash,
  total_cash_in,
  total_cash_out,
  theoretical_balance,
  actual_count,
  difference,
  closing_balance,
  notes,
  closed_by,
  magasin_id
)
VALUES (
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  CURRENT_DATE,
  120.00,
  192.40,
  40.00,
  12.00,
  340.40,
  338.90,
  -1.50,
  338.90,
  'Journee stable avec forte vente carreaux.',
  '44444444-4444-4444-4444-444444444441',
  '33333333-3333-3333-3333-333333333331'
)
ON CONFLICT (id) DO UPDATE
SET
  opening_balance = EXCLUDED.opening_balance,
  total_sales_cash = EXCLUDED.total_sales_cash,
  total_cash_in = EXCLUDED.total_cash_in,
  total_cash_out = EXCLUDED.total_cash_out,
  theoretical_balance = EXCLUDED.theoretical_balance,
  actual_count = EXCLUDED.actual_count,
  difference = EXCLUDED.difference,
  closing_balance = EXCLUDED.closing_balance,
  notes = EXCLUDED.notes;

INSERT INTO public.forum_messages (id, username, content, company_id)
VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
    'Admin Demo',
    'Bienvenue sur l''environnement de demonstration. Pensez a verifier les seuils de stock.',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
    'Responsable Porto',
    'Stock colle en baisse, prevoir un reapprovisionnement la semaine prochaine.',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO UPDATE
SET
  content = EXCLUDED.content;

COMMIT;

-- Synchronisation des utilisateurs auth existants vers public.users.
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN
    SELECT id, email, raw_user_meta_data, created_at
    FROM auth.users
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.users.id
    )
  LOOP
    INSERT INTO public.users (
      auth_user_id,
      name,
      email,
      roles,
      created_at,
      company_id
    ) VALUES (
      auth_user.id,
      COALESCE(auth_user.raw_user_meta_data->>'name', ''),
      auth_user.email,
      ARRAY['employe']::text[],
      auth_user.created_at,
      '11111111-1111-1111-1111-111111111111'
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
  END LOOP;
END $$;
