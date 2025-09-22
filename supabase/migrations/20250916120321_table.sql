create table "public"."cash_counts" (
    "id" uuid not null default uuid_generate_v4(),
    "date" date not null,
    "time" time without time zone not null default CURRENT_TIME,
    "count_type" text not null default 'closing'::text,
    "expected_amount" numeric(12,2) not null default 0,
    "actual_amount" numeric(12,2) not null default 0,
    "difference" numeric(12,2) not null default 0,
    "bills_detail" jsonb,
    "coins_detail" jsonb,
    "note" text,
    "counted_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "magasin_id" uuid,
    "updated_at" timestamp without time zone
);


create table "public"."cash_emptying" (
    "id" uuid not null default uuid_generate_v4(),
    "date" date not null default CURRENT_DATE,
    "amount" numeric(12,2) not null,
    "reason" text not null,
    "destination" text,
    "notes" text,
    "emptied_by" uuid,
    "emptied_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "magasin_id" uuid
);


create table "public"."cash_transactions" (
    "id" uuid not null default uuid_generate_v4(),
    "type" text not null,
    "amount" numeric(12,2) not null,
    "reason" text not null,
    "source" text,
    "recipient" text,
    "note" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "magasin_id" uuid
);


create table "public"."clients" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "email" text not null,
    "phone" text,
    "address" text,
    "created_at" timestamp with time zone not null default now(),
    "magasin_id" uuid
);


create table "public"."company_settings" (
    "company_name" character varying(255) not null default 'Mon Entreprise'::character varying,
    "company_email" character varying(255) not null default 'contact@monentreprise.com'::character varying,
    "company_phone" character varying(50) default '+33 1 23 45 67 89'::character varying,
    "company_address" text default '123 Rue de la Paix, 75001 Paris'::text,
    "company_website" character varying(255) default 'https://www.monentreprise.com'::character varying,
    "currency" character varying(3) default 'EUR'::character varying,
    "tax_rate" numeric(5,2) default 20.00,
    "invoice_prefix" character varying(10) default 'FACT-'::character varying,
    "invoice_number_start" integer default 1000,
    "low_stock_threshold" integer default 10,
    "critical_stock_threshold" integer default 5,
    "enable_stock_alerts" boolean default true,
    "language" character varying(10) default 'fr-FR'::character varying,
    "timezone" character varying(50) default 'Europe/Paris'::character varying,
    "date_format" character varying(20) default 'DD/MM/YYYY'::character varying,
    "number_format" character varying(10) default 'fr-FR'::character varying,
    "session_timeout" integer default 60,
    "enable_two_factor" boolean default false,
    "password_min_length" integer default 8,
    "enable_email_notifications" boolean default true,
    "enable_invoice_reminders" boolean default true,
    "enable_auto_backup" boolean default true,
    "backup_frequency" character varying(20) default 'daily'::character varying,
    "backup_retention" integer default 30,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "company_siret" text,
    "id" uuid not null default uuid_generate_v4()
);


create table "public"."daily_closings" (
    "id" uuid not null default uuid_generate_v4(),
    "date" date not null,
    "opening_balance" numeric(12,2) not null default 0,
    "total_sales_cash" numeric(12,2) not null default 0,
    "total_cash_in" numeric(12,2) not null default 0,
    "total_cash_out" numeric(12,2) not null default 0,
    "theoretical_balance" numeric(12,2) not null default 0,
    "actual_count" numeric(12,2) not null default 0,
    "difference" numeric(12,2) not null default 0,
    "closing_balance" numeric(12,2) not null default 0,
    "cash_details" jsonb,
    "notes" text,
    "closed_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "magasin_id" uuid
);


create table "public"."forum_messages" (
    "id" uuid not null default gen_random_uuid(),
    "username" text not null,
    "content" text not null,
    "created_at" timestamp with time zone default now(),
    "company_id" uuid
);


create table "public"."invoice_items" (
    "id" uuid not null default uuid_generate_v4(),
    "invoice_id" uuid not null,
    "product_id" uuid,
    "quantity" integer not null,
    "price" numeric(10,2) not null,
    "created_at" timestamp with time zone not null default now(),
    "external_reference" character varying(255),
    "external_description" text,
    "is_external" boolean not null default false,
    "magasin_id" uuid
);


create table "public"."invoices" (
    "id" uuid not null default uuid_generate_v4(),
    "client_id" uuid not null,
    "date" date not null default CURRENT_DATE,
    "total" numeric(12,2) not null default 0,
    "status" text not null default 'draft'::text,
    "reference" character varying(100),
    "created_at" timestamp with time zone not null default now(),
    "delivery" boolean,
    "is_external" boolean not null default false,
    "delivery_date" date,
    "delivery_notes" text,
    "magasin_id" uuid,
    "updated_at" timestamp with time zone default now()
);


create table "public"."magasins" (
    "id" uuid not null default uuid_generate_v4(),
    "nom" text not null,
    "adresse" text,
    "telephone" text,
    "email" text,
    "created_at" timestamp with time zone default now(),
    "company_id" uuid
);


create table "public"."payments" (
    "id" uuid not null default gen_random_uuid(),
    "invoice_id" uuid not null,
    "amount" numeric(10,2) not null,
    "payment_date" date not null default CURRENT_DATE,
    "payment_method" character varying(50) not null default 'virement'::character varying,
    "reference" character varying(100),
    "note" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "magasin_id" uuid,
    "company_id" uuid
);


create table "public"."product_types" (
    "id" text not null default uuid_generate_v4(),
    "name" text not null,
    "created_at" timestamp with time zone not null default now(),
    "company_id" uuid
);


create table "public"."products_carreaux" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "description" text,
    "price" numeric(10,2) not null,
    "stock" integer not null,
    "longueur" real,
    "largeur" real,
    "reference" character varying(100),
    "created_at" timestamp with time zone not null default now(),
    "nbr_pieces" smallint,
    "type_produit" text,
    "unite" character varying(20) default 'pièce'::character varying,
    "image_url" text,
    "is_hidden" boolean default false,
    "company_id" uuid
);


create table "public"."stocks" (
    "id" uuid not null default uuid_generate_v4(),
    "product_id" uuid not null,
    "quantity" integer not null,
    "location" text,
    "updated_at" timestamp with time zone not null default now(),
    "company_id" uuid default gen_random_uuid()
);


alter table "public"."stocks" enable row level security;

create table "public"."users" (
    "id" uuid not null default uuid_generate_v4(),
    "auth_user_id" uuid,
    "name" text,
    "email" text not null,
    "password_hash" text,
    "phone" text,
    "roles" text[] not null default ARRAY['ROLE_USER'::text],
    "created_at" timestamp with time zone not null default now(),
    "magasin_id" uuid,
    "company_id" uuid
);


CREATE UNIQUE INDEX cash_counts_pkey ON public.cash_counts USING btree (id);

CREATE UNIQUE INDEX cash_emptying_pkey ON public.cash_emptying USING btree (id);

CREATE UNIQUE INDEX cash_transactions_pkey ON public.cash_transactions USING btree (id);

CREATE UNIQUE INDEX clients_email_key ON public.clients USING btree (email);

CREATE UNIQUE INDEX clients_pkey ON public.clients USING btree (id);

CREATE UNIQUE INDEX company_settings_pkey ON public.company_settings USING btree (id);

CREATE UNIQUE INDEX daily_closings_date_key ON public.daily_closings USING btree (date);

CREATE UNIQUE INDEX daily_closings_pkey ON public.daily_closings USING btree (id);

CREATE UNIQUE INDEX forum_messages_pkey ON public.forum_messages USING btree (id);

CREATE INDEX idx_cash_counts_counted_by ON public.cash_counts USING btree (counted_by);

CREATE INDEX idx_cash_counts_created_at ON public.cash_counts USING btree (created_at);

CREATE INDEX idx_cash_counts_date ON public.cash_counts USING btree (date);

CREATE INDEX idx_cash_counts_magasin_id ON public.cash_counts USING btree (magasin_id);

CREATE INDEX idx_cash_counts_type ON public.cash_counts USING btree (count_type);

CREATE INDEX idx_cash_emptying_created_at ON public.cash_emptying USING btree (created_at);

CREATE INDEX idx_cash_emptying_date ON public.cash_emptying USING btree (date);

CREATE INDEX idx_cash_emptying_emptied_by ON public.cash_emptying USING btree (emptied_by);

CREATE INDEX idx_cash_emptying_magasin_id ON public.cash_emptying USING btree (magasin_id);

CREATE INDEX idx_cash_transactions_created_at ON public.cash_transactions USING btree (created_at);

CREATE INDEX idx_cash_transactions_created_by ON public.cash_transactions USING btree (created_by);

CREATE INDEX idx_cash_transactions_date_type ON public.cash_transactions USING btree (created_at, type);

CREATE INDEX idx_cash_transactions_magasin_id ON public.cash_transactions USING btree (magasin_id);

CREATE INDEX idx_cash_transactions_type ON public.cash_transactions USING btree (type);

CREATE INDEX idx_clients_email ON public.clients USING btree (email);

CREATE INDEX idx_clients_magasin_id ON public.clients USING btree (magasin_id);

CREATE INDEX idx_company_settings_updated_at ON public.company_settings USING btree (updated_at);

CREATE INDEX idx_daily_closings_closed_by ON public.daily_closings USING btree (closed_by);

CREATE INDEX idx_daily_closings_date ON public.daily_closings USING btree (date);

CREATE INDEX idx_daily_closings_magasin_id ON public.daily_closings USING btree (magasin_id);

CREATE INDEX idx_invoice_items_external ON public.invoice_items USING btree (is_external, external_reference) WHERE (is_external = true);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);

CREATE INDEX idx_invoice_items_magasin_id ON public.invoice_items USING btree (magasin_id);

CREATE INDEX idx_invoice_items_product_id ON public.invoice_items USING btree (product_id);

CREATE INDEX idx_invoices_client_id ON public.invoices USING btree (client_id);

CREATE INDEX idx_invoices_delivery_date ON public.invoices USING btree (delivery_date) WHERE (delivery_date IS NOT NULL);

CREATE INDEX idx_invoices_delivery_status ON public.invoices USING btree (delivery) WHERE (delivery IS NOT NULL);

CREATE INDEX idx_invoices_external ON public.invoices USING btree (is_external) WHERE (is_external = true);

CREATE INDEX idx_invoices_magasin_id ON public.invoices USING btree (magasin_id);

CREATE INDEX idx_payments_created_at ON public.payments USING btree (created_at);

CREATE INDEX idx_payments_invoice_id ON public.payments USING btree (invoice_id);

CREATE INDEX idx_payments_magasin_id ON public.payments USING btree (magasin_id);

CREATE INDEX idx_payments_payment_date ON public.payments USING btree (payment_date);

CREATE INDEX idx_products_reference ON public.products_carreaux USING btree (reference);

CREATE INDEX idx_stocks_product_id ON public.stocks USING btree (product_id);

CREATE INDEX idx_users_email ON public.users USING btree (email);

CREATE INDEX idx_users_magasin_id ON public.users USING btree (magasin_id);

CREATE UNIQUE INDEX invoice_items_pkey ON public.invoice_items USING btree (id);

CREATE UNIQUE INDEX invoices_pkey ON public.invoices USING btree (id);

CREATE UNIQUE INDEX magasins_pkey ON public.magasins USING btree (id);

CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);

CREATE UNIQUE INDEX product_types_name_key ON public.product_types USING btree (name);

CREATE UNIQUE INDEX product_types_pkey ON public.product_types USING btree (id);

CREATE UNIQUE INDEX products_carreaux_pkey ON public.products_carreaux USING btree (id);

CREATE UNIQUE INDEX products_carreaux_reference_key ON public.products_carreaux USING btree (reference);

CREATE UNIQUE INDEX stocks_pkey ON public.stocks USING btree (id);

CREATE UNIQUE INDEX unique_cash_count_per_day_per_store ON public.cash_counts USING btree (date, magasin_id);

CREATE UNIQUE INDEX users_auth_user_id_key ON public.users USING btree (auth_user_id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX ux_invoice_items_invoice_stock_prod ON public.invoice_items USING btree (invoice_id, product_id) WHERE (product_id IS NOT NULL);

alter table "public"."cash_counts" add constraint "cash_counts_pkey" PRIMARY KEY using index "cash_counts_pkey";

alter table "public"."cash_emptying" add constraint "cash_emptying_pkey" PRIMARY KEY using index "cash_emptying_pkey";

alter table "public"."cash_transactions" add constraint "cash_transactions_pkey" PRIMARY KEY using index "cash_transactions_pkey";

alter table "public"."clients" add constraint "clients_pkey" PRIMARY KEY using index "clients_pkey";

alter table "public"."company_settings" add constraint "company_settings_pkey" PRIMARY KEY using index "company_settings_pkey";

alter table "public"."daily_closings" add constraint "daily_closings_pkey" PRIMARY KEY using index "daily_closings_pkey";

alter table "public"."forum_messages" add constraint "forum_messages_pkey" PRIMARY KEY using index "forum_messages_pkey";

alter table "public"."invoice_items" add constraint "invoice_items_pkey" PRIMARY KEY using index "invoice_items_pkey";

alter table "public"."invoices" add constraint "invoices_pkey" PRIMARY KEY using index "invoices_pkey";

alter table "public"."magasins" add constraint "magasins_pkey" PRIMARY KEY using index "magasins_pkey";

alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";

alter table "public"."product_types" add constraint "product_types_pkey" PRIMARY KEY using index "product_types_pkey";

alter table "public"."products_carreaux" add constraint "products_carreaux_pkey" PRIMARY KEY using index "products_carreaux_pkey";

alter table "public"."stocks" add constraint "stocks_pkey" PRIMARY KEY using index "stocks_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."cash_counts" add constraint "cash_counts_count_type_check" CHECK ((count_type = ANY (ARRAY['opening'::text, 'intermediate'::text, 'closing'::text]))) not valid;

alter table "public"."cash_counts" validate constraint "cash_counts_count_type_check";

alter table "public"."cash_counts" add constraint "cash_counts_magasin_id_fkey" FOREIGN KEY (magasin_id) REFERENCES magasins(id) not valid;

alter table "public"."cash_counts" validate constraint "cash_counts_magasin_id_fkey";

alter table "public"."cash_counts" add constraint "fk_cash_counts_counted_by" FOREIGN KEY (counted_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."cash_counts" validate constraint "fk_cash_counts_counted_by";

alter table "public"."cash_counts" add constraint "unique_cash_count_per_day_per_store" UNIQUE using index "unique_cash_count_per_day_per_store";

alter table "public"."cash_emptying" add constraint "cash_emptying_amount_check" CHECK ((amount > (0)::numeric)) not valid;

alter table "public"."cash_emptying" validate constraint "cash_emptying_amount_check";

alter table "public"."cash_emptying" add constraint "cash_emptying_magasin_id_fkey" FOREIGN KEY (magasin_id) REFERENCES magasins(id) not valid;

alter table "public"."cash_emptying" validate constraint "cash_emptying_magasin_id_fkey";

alter table "public"."cash_emptying" add constraint "fk_cash_emptying_emptied_by" FOREIGN KEY (emptied_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."cash_emptying" validate constraint "fk_cash_emptying_emptied_by";

alter table "public"."cash_transactions" add constraint "cash_transactions_amount_check" CHECK ((amount > (0)::numeric)) not valid;

alter table "public"."cash_transactions" validate constraint "cash_transactions_amount_check";

alter table "public"."cash_transactions" add constraint "cash_transactions_magasin_id_fkey" FOREIGN KEY (magasin_id) REFERENCES magasins(id) not valid;

alter table "public"."cash_transactions" validate constraint "cash_transactions_magasin_id_fkey";

alter table "public"."cash_transactions" add constraint "cash_transactions_type_check" CHECK ((type = ANY (ARRAY['in'::text, 'out'::text]))) not valid;

alter table "public"."cash_transactions" validate constraint "cash_transactions_type_check";

alter table "public"."cash_transactions" add constraint "fk_cash_transactions_created_by" FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."cash_transactions" validate constraint "fk_cash_transactions_created_by";

alter table "public"."clients" add constraint "clients_email_key" UNIQUE using index "clients_email_key";

alter table "public"."clients" add constraint "clients_magasin_id_fkey" FOREIGN KEY (magasin_id) REFERENCES magasins(id) not valid;

alter table "public"."clients" validate constraint "clients_magasin_id_fkey";

alter table "public"."company_settings" add constraint "check_stock_thresholds" CHECK ((critical_stock_threshold <= low_stock_threshold)) not valid;

alter table "public"."company_settings" validate constraint "check_stock_thresholds";

alter table "public"."company_settings" add constraint "company_settings_backup_frequency_check" CHECK (((backup_frequency)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::text[]))) not valid;

alter table "public"."company_settings" validate constraint "company_settings_backup_frequency_check";

alter table "public"."company_settings" add constraint "company_settings_backup_retention_check" CHECK (((backup_retention >= 7) AND (backup_retention <= 365))) not valid;

alter table "public"."company_settings" validate constraint "company_settings_backup_retention_check";

alter table "public"."company_settings" add constraint "company_settings_critical_stock_threshold_check" CHECK ((critical_stock_threshold >= 0)) not valid;

alter table "public"."company_settings" validate constraint "company_settings_critical_stock_threshold_check";

alter table "public"."company_settings" add constraint "company_settings_currency_check" CHECK (((currency)::text = ANY ((ARRAY['EUR'::character varying, 'USD'::character varying, 'GBP'::character varying, 'CHF'::character varying])::text[]))) not valid;

alter table "public"."company_settings" validate constraint "company_settings_currency_check";

alter table "public"."company_settings" add constraint "company_settings_date_format_check" CHECK (((date_format)::text = ANY ((ARRAY['DD/MM/YYYY'::character varying, 'MM/DD/YYYY'::character varying, 'YYYY-MM-DD'::character varying, 'DD-MM-YYYY'::character varying])::text[]))) not valid;

alter table "public"."company_settings" validate constraint "company_settings_date_format_check";

alter table "public"."company_settings" add constraint "company_settings_invoice_number_start_check" CHECK ((invoice_number_start > 0)) not valid;

alter table "public"."company_settings" validate constraint "company_settings_invoice_number_start_check";

alter table "public"."company_settings" add constraint "company_settings_language_check" CHECK (((language)::text = ANY ((ARRAY['fr-FR'::character varying, 'en-US'::character varying, 'es-ES'::character varying, 'de-DE'::character varying])::text[]))) not valid;

alter table "public"."company_settings" validate constraint "company_settings_language_check";

alter table "public"."company_settings" add constraint "company_settings_low_stock_threshold_check" CHECK ((low_stock_threshold >= 0)) not valid;

alter table "public"."company_settings" validate constraint "company_settings_low_stock_threshold_check";

alter table "public"."company_settings" add constraint "company_settings_password_min_length_check" CHECK (((password_min_length >= 6) AND (password_min_length <= 20))) not valid;

alter table "public"."company_settings" validate constraint "company_settings_password_min_length_check";

alter table "public"."company_settings" add constraint "company_settings_session_timeout_check" CHECK (((session_timeout >= 5) AND (session_timeout <= 480))) not valid;

alter table "public"."company_settings" validate constraint "company_settings_session_timeout_check";

alter table "public"."company_settings" add constraint "company_settings_tax_rate_check" CHECK (((tax_rate >= (0)::numeric) AND (tax_rate <= (100)::numeric))) not valid;

alter table "public"."company_settings" validate constraint "company_settings_tax_rate_check";

alter table "public"."daily_closings" add constraint "daily_closings_date_key" UNIQUE using index "daily_closings_date_key";

alter table "public"."daily_closings" add constraint "daily_closings_magasin_id_fkey" FOREIGN KEY (magasin_id) REFERENCES magasins(id) not valid;

alter table "public"."daily_closings" validate constraint "daily_closings_magasin_id_fkey";

alter table "public"."daily_closings" add constraint "fk_daily_closings_closed_by" FOREIGN KEY (closed_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."daily_closings" validate constraint "fk_daily_closings_closed_by";

alter table "public"."forum_messages" add constraint "forum_messages_company_id_fkey" FOREIGN KEY (company_id) REFERENCES company_settings(id) not valid;

alter table "public"."forum_messages" validate constraint "forum_messages_company_id_fkey";

alter table "public"."invoice_items" add constraint "chk_product_or_external" CHECK ((((product_id IS NOT NULL) AND (external_reference IS NULL) AND (external_description IS NULL) AND (is_external = false)) OR ((product_id IS NULL) AND (external_reference IS NOT NULL) AND (external_description IS NOT NULL) AND (is_external = true)))) not valid;

alter table "public"."invoice_items" validate constraint "chk_product_or_external";

alter table "public"."invoice_items" add constraint "invoice_items_invoice_fkey" FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE not valid;

alter table "public"."invoice_items" validate constraint "invoice_items_invoice_fkey";

alter table "public"."invoice_items" add constraint "invoice_items_magasin_id_fkey" FOREIGN KEY (magasin_id) REFERENCES magasins(id) not valid;

alter table "public"."invoice_items" validate constraint "invoice_items_magasin_id_fkey";

alter table "public"."invoice_items" add constraint "invoice_items_price_check" CHECK ((price >= (0)::numeric)) not valid;

alter table "public"."invoice_items" validate constraint "invoice_items_price_check";

alter table "public"."invoice_items" add constraint "invoice_items_product_fkey" FOREIGN KEY (product_id) REFERENCES products_carreaux(id) ON DELETE RESTRICT not valid;

alter table "public"."invoice_items" validate constraint "invoice_items_product_fkey";

alter table "public"."invoice_items" add constraint "invoice_items_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."invoice_items" validate constraint "invoice_items_quantity_check";

alter table "public"."invoices" add constraint "invoices_client_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT not valid;

alter table "public"."invoices" validate constraint "invoices_client_fkey";

alter table "public"."invoices" add constraint "invoices_magasin_id_fkey" FOREIGN KEY (magasin_id) REFERENCES magasins(id) not valid;

alter table "public"."invoices" validate constraint "invoices_magasin_id_fkey";

alter table "public"."invoices" add constraint "invoices_total_check" CHECK ((total >= (0)::numeric)) not valid;

alter table "public"."invoices" validate constraint "invoices_total_check";

alter table "public"."magasins" add constraint "magasins_company_id_fkey" FOREIGN KEY (company_id) REFERENCES company_settings(id) not valid;

alter table "public"."magasins" validate constraint "magasins_company_id_fkey";

alter table "public"."payments" add constraint "chk_payment_method" CHECK (((payment_method)::text = ANY ((ARRAY['virement'::character varying, 'cheque'::character varying, 'especes'::character varying, 'carte'::character varying, 'autre'::character varying])::text[]))) not valid;

alter table "public"."payments" validate constraint "chk_payment_method";

alter table "public"."payments" add constraint "payments_amount_check" CHECK ((amount > (0)::numeric)) not valid;

alter table "public"."payments" validate constraint "payments_amount_check";

alter table "public"."payments" add constraint "payments_company_id_fkey" FOREIGN KEY (company_id) REFERENCES company_settings(id) not valid;

alter table "public"."payments" validate constraint "payments_company_id_fkey";

alter table "public"."payments" add constraint "payments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_invoice_id_fkey";

alter table "public"."payments" add constraint "payments_magasin_id_fkey" FOREIGN KEY (magasin_id) REFERENCES magasins(id) not valid;

alter table "public"."payments" validate constraint "payments_magasin_id_fkey";

alter table "public"."product_types" add constraint "product_types_company_id_fkey" FOREIGN KEY (company_id) REFERENCES company_settings(id) not valid;

alter table "public"."product_types" validate constraint "product_types_company_id_fkey";

alter table "public"."product_types" add constraint "product_types_name_key" UNIQUE using index "product_types_name_key";

alter table "public"."products_carreaux" add constraint "fk_product_type" FOREIGN KEY (type_produit) REFERENCES product_types(id) not valid;

alter table "public"."products_carreaux" validate constraint "fk_product_type";

alter table "public"."products_carreaux" add constraint "products_carreaux_company_id_fkey" FOREIGN KEY (company_id) REFERENCES company_settings(id) not valid;

alter table "public"."products_carreaux" validate constraint "products_carreaux_company_id_fkey";

alter table "public"."products_carreaux" add constraint "products_carreaux_price_check" CHECK ((price >= (0)::numeric)) not valid;

alter table "public"."products_carreaux" validate constraint "products_carreaux_price_check";

alter table "public"."products_carreaux" add constraint "products_carreaux_reference_key" UNIQUE using index "products_carreaux_reference_key";

alter table "public"."products_carreaux" add constraint "products_carreaux_stock_check" CHECK ((stock >= 0)) not valid;

alter table "public"."products_carreaux" validate constraint "products_carreaux_stock_check";

alter table "public"."stocks" add constraint "stocks_company_id_fkey" FOREIGN KEY (company_id) REFERENCES company_settings(id) not valid;

alter table "public"."stocks" validate constraint "stocks_company_id_fkey";

alter table "public"."stocks" add constraint "stocks_product_fkey" FOREIGN KEY (product_id) REFERENCES products_carreaux(id) ON DELETE CASCADE not valid;

alter table "public"."stocks" validate constraint "stocks_product_fkey";

alter table "public"."stocks" add constraint "stocks_quantity_check" CHECK ((quantity >= 0)) not valid;

alter table "public"."stocks" validate constraint "stocks_quantity_check";

alter table "public"."users" add constraint "users_auth_user_id_key" UNIQUE using index "users_auth_user_id_key";

alter table "public"."users" add constraint "users_company_id_fkey" FOREIGN KEY (company_id) REFERENCES company_settings(id) not valid;

alter table "public"."users" validate constraint "users_company_id_fkey";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "public"."users" add constraint "users_magasin_id_fkey" FOREIGN KEY (magasin_id) REFERENCES magasins(id) not valid;

alter table "public"."users" validate constraint "users_magasin_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_theoretical_cash(target_date date)
 RETURNS TABLE(opening_balance numeric, sales_cash numeric, cash_in numeric, cash_out numeric, theoretical_balance numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    public.get_opening_balance(target_date) as opening_balance,
    
    -- Espèces des ventes du jour
    COALESCE((
      SELECT SUM(p.amount)
      FROM public.payments p
      JOIN public.invoices i ON p.invoice_id = i.id
      WHERE DATE(p.payment_date) = target_date
      AND p.payment_method = 'especes'
    ), 0) as sales_cash,
    
    -- Entrées d'argent du jour
    COALESCE((
      SELECT SUM(amount)
      FROM public.cash_transactions
      WHERE DATE(created_at) = target_date
      AND type = 'in'
    ), 0) as cash_in,
    
    -- Sorties d'argent du jour
    COALESCE((
      SELECT SUM(amount)
      FROM public.cash_transactions
      WHERE DATE(created_at) = target_date
      AND type = 'out'
    ), 0) as cash_out,
    
    -- Calcul du solde théorique
    (public.get_opening_balance(target_date) + 
     COALESCE((SELECT SUM(p.amount) FROM public.payments p JOIN public.invoices i ON p.invoice_id = i.id WHERE DATE(p.payment_date) = target_date AND p.payment_method = 'especes'), 0) + 
     COALESCE((SELECT SUM(amount) FROM public.cash_transactions WHERE DATE(created_at) = target_date AND type = 'in'), 0) - 
     COALESCE((SELECT SUM(amount) FROM public.cash_transactions WHERE DATE(created_at) = target_date AND type = 'out'), 0)
    ) as theoretical_balance;
END;
$function$
;

create or replace view "public"."company_settings_view" as  SELECT company_settings.id,
    company_settings.company_name,
    company_settings.company_email,
    company_settings.company_phone,
    company_settings.company_address,
    company_settings.company_website,
    company_settings.currency,
    company_settings.tax_rate,
    company_settings.invoice_prefix,
    company_settings.invoice_number_start,
    company_settings.low_stock_threshold,
    company_settings.critical_stock_threshold,
    company_settings.enable_stock_alerts,
    company_settings.language,
    company_settings.timezone,
    company_settings.date_format,
    company_settings.number_format,
    company_settings.session_timeout,
    company_settings.enable_two_factor,
    company_settings.password_min_length,
    company_settings.enable_email_notifications,
    company_settings.enable_invoice_reminders,
    company_settings.enable_auto_backup,
    company_settings.backup_frequency,
    company_settings.backup_retention,
    company_settings.created_at,
    company_settings.updated_at,
        CASE
            WHEN ((company_settings.currency)::text = 'EUR'::text) THEN '€'::character varying
            WHEN ((company_settings.currency)::text = 'USD'::text) THEN '$'::character varying
            WHEN ((company_settings.currency)::text = 'GBP'::text) THEN '£'::character varying
            WHEN ((company_settings.currency)::text = 'CHF'::text) THEN 'CHF'::character varying
            ELSE company_settings.currency
        END AS currency_symbol,
    (company_settings.tax_rate / (100)::numeric) AS tax_rate_decimal,
        CASE
            WHEN company_settings.enable_stock_alerts THEN 'Activées'::text
            ELSE 'Désactivées'::text
        END AS stock_alerts_status
   FROM company_settings;


create or replace view "public"."daily_cash_summary" as  SELECT date(COALESCE(ct.created_at, (p.payment_date)::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone)) AS date,
    COALESCE(sum(
        CASE
            WHEN ((p.payment_method)::text = 'especes'::text) THEN p.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS sales_cash,
    COALESCE(sum(
        CASE
            WHEN (ct.type = 'in'::text) THEN ct.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS cash_in,
    COALESCE(sum(
        CASE
            WHEN (ct.type = 'out'::text) THEN ct.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS cash_out,
    ((COALESCE(sum(
        CASE
            WHEN ((p.payment_method)::text = 'especes'::text) THEN p.amount
            ELSE (0)::numeric
        END), (0)::numeric) + COALESCE(sum(
        CASE
            WHEN (ct.type = 'in'::text) THEN ct.amount
            ELSE (0)::numeric
        END), (0)::numeric)) - COALESCE(sum(
        CASE
            WHEN (ct.type = 'out'::text) THEN ct.amount
            ELSE (0)::numeric
        END), (0)::numeric)) AS theoretical_balance,
    count(DISTINCT COALESCE(ct.id, p.id)) AS transaction_count
   FROM (cash_transactions ct
     FULL JOIN payments p ON ((date(ct.created_at) = p.payment_date)))
  GROUP BY (date(COALESCE(ct.created_at, (p.payment_date)::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone)))
  ORDER BY (date(COALESCE(ct.created_at, (p.payment_date)::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone))) DESC;


CREATE OR REPLACE FUNCTION public.decrement_stock_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  ligne RECORD;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    FOR ligne IN
      SELECT product_id, quantity
      FROM public.invoice_items
      WHERE invoice_id = NEW.id 
        AND product_id IS NOT NULL  -- Ignorer les produits externes
        AND is_external = FALSE     -- Double vérification
    LOOP
      -- Mettre à jour le stock disponible
      UPDATE public.products_carreaux
      SET stock = stock - ligne.quantity
      WHERE id = ligne.product_id;

      -- Enregistrer le mouvement dans stocks (quantité positive)
      INSERT INTO public.stocks (
        product_id,
        quantity,
        location,
        updated_at
      ) VALUES (
        ligne.product_id,
        ligne.quantity,  -- toujours positif
        'Décrémentation facture ' || NEW.id::TEXT,
        NOW()
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_clients_with_invoices()
 RETURNS TABLE(client_id uuid, client_name text, client_email text, invoice_id uuid, invoice_date date, invoice_total numeric, invoice_status text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS client_id,
    c.name AS client_name,
    c.email AS client_email,
    i.id AS invoice_id,
    i.date AS invoice_date,
    i.total AS invoice_total,
    i.status AS invoice_status
  FROM
    public.clients c
  INNER JOIN
    public.invoices i
  ON
    c.id = i.client_id
  WHERE
    i.status IS NOT NULL; -- Optionnel : Filtrer par statut spécifique si nécessaire
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_company_settings()
 RETURNS company_settings
 LANGUAGE plpgsql
AS $function$
DECLARE
  settings company_settings;
BEGIN
  SELECT * INTO settings FROM company_settings LIMIT 1;
  
  -- Si aucun paramètre n'existe, créer les paramètres par défaut
  IF NOT FOUND THEN
    INSERT INTO company_settings DEFAULT VALUES RETURNING * INTO settings;
  END IF;
  
  RETURN settings;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_opening_balance(target_date date)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
    previous_closing DECIMAL(12,2) := 0;
BEGIN
    SELECT closing_balance 
    INTO previous_closing
    FROM daily_closings 
    WHERE date = target_date - INTERVAL '1 day';
    
    RETURN COALESCE(previous_closing, 0);
END;
$function$
;

create or replace view "public"."payment_summary" as  SELECT i.id AS invoice_id,
    i.reference AS invoice_reference,
    i.total AS invoice_total,
    COALESCE(sum(p.amount), (0)::numeric) AS total_paid,
    (i.total - COALESCE(sum(p.amount), (0)::numeric)) AS remaining_amount,
        CASE
            WHEN (COALESCE(sum(p.amount), (0)::numeric) >= i.total) THEN 'fully_paid'::text
            WHEN (COALESCE(sum(p.amount), (0)::numeric) > (0)::numeric) THEN 'partially_paid'::text
            ELSE 'unpaid'::text
        END AS payment_status,
    count(p.id) AS payment_count
   FROM (invoices i
     LEFT JOIN payments p ON ((i.id = p.invoice_id)))
  GROUP BY i.id, i.reference, i.total;


CREATE OR REPLACE FUNCTION public.sync_all_auth_users()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_count integer := 0;
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT id, email, raw_user_meta_data, created_at
    FROM auth.users
  LOOP
    -- Vérifier si l'utilisateur n'existe pas déjà dans public.users
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth_user.id) THEN
      INSERT INTO public.users (
        auth_user_id,
        name,
        email,
        roles,
        created_at
      ) VALUES (
        auth_user.id,
        COALESCE(auth_user.raw_user_meta_data->>'name', ''),
        auth_user.email,
        ARRAY['employe']::text[],
        auth_user.created_at
      );
      user_count := user_count + 1;
    END IF;
  END LOOP;
  
  RETURN user_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_user_profile(user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  auth_user_record RECORD;
BEGIN
  -- Récupérer les informations de l'utilisateur depuis auth.users
  SELECT id, email, raw_user_meta_data, created_at 
  INTO auth_user_record
  FROM auth.users 
  WHERE id = user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur non trouvé dans auth.users avec id: %', user_id;
  END IF;

  -- Insérer ou mettre à jour dans public.users
  INSERT INTO public.users (
    auth_user_id,
    name,
    email,
    roles,
    created_at
  ) VALUES (
    auth_user_record.id,
    COALESCE(auth_user_record.raw_user_meta_data->>'name', ''),
    auth_user_record.email,
    ARRAY['employe']::text[],
    auth_user_record.created_at
  ) ON CONFLICT (auth_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name);
    
  RAISE NOTICE 'Utilisateur synchronisé: % (%)', auth_user_record.email, user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_company_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_company_settings(p_company_name character varying DEFAULT NULL::character varying, p_company_email character varying DEFAULT NULL::character varying, p_company_phone character varying DEFAULT NULL::character varying, p_company_address text DEFAULT NULL::text, p_company_website character varying DEFAULT NULL::character varying, p_currency character varying DEFAULT NULL::character varying, p_tax_rate numeric DEFAULT NULL::numeric, p_invoice_prefix character varying DEFAULT NULL::character varying, p_invoice_number_start integer DEFAULT NULL::integer, p_low_stock_threshold integer DEFAULT NULL::integer, p_critical_stock_threshold integer DEFAULT NULL::integer, p_enable_stock_alerts boolean DEFAULT NULL::boolean, p_language character varying DEFAULT NULL::character varying, p_timezone character varying DEFAULT NULL::character varying, p_date_format character varying DEFAULT NULL::character varying, p_number_format character varying DEFAULT NULL::character varying, p_session_timeout integer DEFAULT NULL::integer, p_enable_two_factor boolean DEFAULT NULL::boolean, p_password_min_length integer DEFAULT NULL::integer, p_enable_email_notifications boolean DEFAULT NULL::boolean, p_enable_invoice_reminders boolean DEFAULT NULL::boolean, p_enable_auto_backup boolean DEFAULT NULL::boolean, p_backup_frequency character varying DEFAULT NULL::character varying, p_backup_retention integer DEFAULT NULL::integer)
 RETURNS company_settings
 LANGUAGE plpgsql
AS $function$
DECLARE
  result company_settings;
BEGIN
  -- Mettre à jour ou insérer les paramètres
  INSERT INTO company_settings (
    company_name,
    company_email,
    company_phone,
    company_address,
    company_website,
    currency,
    tax_rate,
    invoice_prefix,
    invoice_number_start,
    low_stock_threshold,
    critical_stock_threshold,
    enable_stock_alerts,
    language,
    timezone,
    date_format,
    number_format,
    session_timeout,
    enable_two_factor,
    password_min_length,
    enable_email_notifications,
    enable_invoice_reminders,
    enable_auto_backup,
    backup_frequency,
    backup_retention
  ) VALUES (
    COALESCE(p_company_name, 'Mon Entreprise'),
    COALESCE(p_company_email, 'contact@monentreprise.com'),
    COALESCE(p_company_phone, '+33 1 23 45 67 89'),
    COALESCE(p_company_address, '123 Rue de la Paix, 75001 Paris'),
    COALESCE(p_company_website, 'https://www.monentreprise.com'),
    COALESCE(p_currency, 'EUR'),
    COALESCE(p_tax_rate, 20.00),
    COALESCE(p_invoice_prefix, 'FACT-'),
    COALESCE(p_invoice_number_start, 1000),
    COALESCE(p_low_stock_threshold, 10),
    COALESCE(p_critical_stock_threshold, 5),
    COALESCE(p_enable_stock_alerts, true),
    COALESCE(p_language, 'fr-FR'),
    COALESCE(p_timezone, 'Europe/Paris'),
    COALESCE(p_date_format, 'DD/MM/YYYY'),
    COALESCE(p_number_format, 'fr-FR'),
    COALESCE(p_session_timeout, 60),
    COALESCE(p_enable_two_factor, false),
    COALESCE(p_password_min_length, 8),
    COALESCE(p_enable_email_notifications, true),
    COALESCE(p_enable_invoice_reminders, true),
    COALESCE(p_enable_auto_backup, true),
    COALESCE(p_backup_frequency, 'daily'),
    COALESCE(p_backup_retention, 30)
  )
  ON CONFLICT (id) DO UPDATE SET
    company_name = COALESCE(p_company_name, company_settings.company_name),
    company_email = COALESCE(p_company_email, company_settings.company_email),
    company_phone = COALESCE(p_company_phone, company_settings.company_phone),
    company_address = COALESCE(p_company_address, company_settings.company_address),
    company_website = COALESCE(p_company_website, company_settings.company_website),
    currency = COALESCE(p_currency, company_settings.currency),
    tax_rate = COALESCE(p_tax_rate, company_settings.tax_rate),
    invoice_prefix = COALESCE(p_invoice_prefix, company_settings.invoice_prefix),
    invoice_number_start = COALESCE(p_invoice_number_start, company_settings.invoice_number_start),
    low_stock_threshold = COALESCE(p_low_stock_threshold, company_settings.low_stock_threshold),
    critical_stock_threshold = COALESCE(p_critical_stock_threshold, company_settings.critical_stock_threshold),
    enable_stock_alerts = COALESCE(p_enable_stock_alerts, company_settings.enable_stock_alerts),
    language = COALESCE(p_language, company_settings.language),
    timezone = COALESCE(p_timezone, company_settings.timezone),
    date_format = COALESCE(p_date_format, company_settings.date_format),
    number_format = COALESCE(p_number_format, company_settings.number_format),
    session_timeout = COALESCE(p_session_timeout, company_settings.session_timeout),
    enable_two_factor = COALESCE(p_enable_two_factor, company_settings.enable_two_factor),
    password_min_length = COALESCE(p_password_min_length, company_settings.password_min_length),
    enable_email_notifications = COALESCE(p_enable_email_notifications, company_settings.enable_email_notifications),
    enable_invoice_reminders = COALESCE(p_enable_invoice_reminders, company_settings.enable_invoice_reminders),
    enable_auto_backup = COALESCE(p_enable_auto_backup, company_settings.enable_auto_backup),
    backup_frequency = COALESCE(p_backup_frequency, company_settings.backup_frequency),
    backup_retention = COALESCE(p_backup_retention, company_settings.backup_retention),
    updated_at = CURRENT_TIMESTAMP
  RETURNING * INTO result;
  
  RETURN result;
END;
$function$
;

grant delete on table "public"."cash_counts" to "anon";

grant insert on table "public"."cash_counts" to "anon";

grant references on table "public"."cash_counts" to "anon";

grant select on table "public"."cash_counts" to "anon";

grant trigger on table "public"."cash_counts" to "anon";

grant truncate on table "public"."cash_counts" to "anon";

grant update on table "public"."cash_counts" to "anon";

grant delete on table "public"."cash_counts" to "authenticated";

grant insert on table "public"."cash_counts" to "authenticated";

grant references on table "public"."cash_counts" to "authenticated";

grant select on table "public"."cash_counts" to "authenticated";

grant trigger on table "public"."cash_counts" to "authenticated";

grant truncate on table "public"."cash_counts" to "authenticated";

grant update on table "public"."cash_counts" to "authenticated";

grant delete on table "public"."cash_counts" to "service_role";

grant insert on table "public"."cash_counts" to "service_role";

grant references on table "public"."cash_counts" to "service_role";

grant select on table "public"."cash_counts" to "service_role";

grant trigger on table "public"."cash_counts" to "service_role";

grant truncate on table "public"."cash_counts" to "service_role";

grant update on table "public"."cash_counts" to "service_role";

grant delete on table "public"."cash_emptying" to "anon";

grant insert on table "public"."cash_emptying" to "anon";

grant references on table "public"."cash_emptying" to "anon";

grant select on table "public"."cash_emptying" to "anon";

grant trigger on table "public"."cash_emptying" to "anon";

grant truncate on table "public"."cash_emptying" to "anon";

grant update on table "public"."cash_emptying" to "anon";

grant delete on table "public"."cash_emptying" to "authenticated";

grant insert on table "public"."cash_emptying" to "authenticated";

grant references on table "public"."cash_emptying" to "authenticated";

grant select on table "public"."cash_emptying" to "authenticated";

grant trigger on table "public"."cash_emptying" to "authenticated";

grant truncate on table "public"."cash_emptying" to "authenticated";

grant update on table "public"."cash_emptying" to "authenticated";

grant delete on table "public"."cash_emptying" to "service_role";

grant insert on table "public"."cash_emptying" to "service_role";

grant references on table "public"."cash_emptying" to "service_role";

grant select on table "public"."cash_emptying" to "service_role";

grant trigger on table "public"."cash_emptying" to "service_role";

grant truncate on table "public"."cash_emptying" to "service_role";

grant update on table "public"."cash_emptying" to "service_role";

grant delete on table "public"."cash_transactions" to "anon";

grant insert on table "public"."cash_transactions" to "anon";

grant references on table "public"."cash_transactions" to "anon";

grant select on table "public"."cash_transactions" to "anon";

grant trigger on table "public"."cash_transactions" to "anon";

grant truncate on table "public"."cash_transactions" to "anon";

grant update on table "public"."cash_transactions" to "anon";

grant delete on table "public"."cash_transactions" to "authenticated";

grant insert on table "public"."cash_transactions" to "authenticated";

grant references on table "public"."cash_transactions" to "authenticated";

grant select on table "public"."cash_transactions" to "authenticated";

grant trigger on table "public"."cash_transactions" to "authenticated";

grant truncate on table "public"."cash_transactions" to "authenticated";

grant update on table "public"."cash_transactions" to "authenticated";

grant delete on table "public"."cash_transactions" to "service_role";

grant insert on table "public"."cash_transactions" to "service_role";

grant references on table "public"."cash_transactions" to "service_role";

grant select on table "public"."cash_transactions" to "service_role";

grant trigger on table "public"."cash_transactions" to "service_role";

grant truncate on table "public"."cash_transactions" to "service_role";

grant update on table "public"."cash_transactions" to "service_role";

grant delete on table "public"."clients" to "anon";

grant insert on table "public"."clients" to "anon";

grant references on table "public"."clients" to "anon";

grant select on table "public"."clients" to "anon";

grant trigger on table "public"."clients" to "anon";

grant truncate on table "public"."clients" to "anon";

grant update on table "public"."clients" to "anon";

grant delete on table "public"."clients" to "authenticated";

grant insert on table "public"."clients" to "authenticated";

grant references on table "public"."clients" to "authenticated";

grant select on table "public"."clients" to "authenticated";

grant trigger on table "public"."clients" to "authenticated";

grant truncate on table "public"."clients" to "authenticated";

grant update on table "public"."clients" to "authenticated";

grant delete on table "public"."clients" to "service_role";

grant insert on table "public"."clients" to "service_role";

grant references on table "public"."clients" to "service_role";

grant select on table "public"."clients" to "service_role";

grant trigger on table "public"."clients" to "service_role";

grant truncate on table "public"."clients" to "service_role";

grant update on table "public"."clients" to "service_role";

grant delete on table "public"."company_settings" to "anon";

grant insert on table "public"."company_settings" to "anon";

grant references on table "public"."company_settings" to "anon";

grant select on table "public"."company_settings" to "anon";

grant trigger on table "public"."company_settings" to "anon";

grant truncate on table "public"."company_settings" to "anon";

grant update on table "public"."company_settings" to "anon";

grant delete on table "public"."company_settings" to "authenticated";

grant insert on table "public"."company_settings" to "authenticated";

grant references on table "public"."company_settings" to "authenticated";

grant select on table "public"."company_settings" to "authenticated";

grant trigger on table "public"."company_settings" to "authenticated";

grant truncate on table "public"."company_settings" to "authenticated";

grant update on table "public"."company_settings" to "authenticated";

grant delete on table "public"."company_settings" to "service_role";

grant insert on table "public"."company_settings" to "service_role";

grant references on table "public"."company_settings" to "service_role";

grant select on table "public"."company_settings" to "service_role";

grant trigger on table "public"."company_settings" to "service_role";

grant truncate on table "public"."company_settings" to "service_role";

grant update on table "public"."company_settings" to "service_role";

grant delete on table "public"."daily_closings" to "anon";

grant insert on table "public"."daily_closings" to "anon";

grant references on table "public"."daily_closings" to "anon";

grant select on table "public"."daily_closings" to "anon";

grant trigger on table "public"."daily_closings" to "anon";

grant truncate on table "public"."daily_closings" to "anon";

grant update on table "public"."daily_closings" to "anon";

grant delete on table "public"."daily_closings" to "authenticated";

grant insert on table "public"."daily_closings" to "authenticated";

grant references on table "public"."daily_closings" to "authenticated";

grant select on table "public"."daily_closings" to "authenticated";

grant trigger on table "public"."daily_closings" to "authenticated";

grant truncate on table "public"."daily_closings" to "authenticated";

grant update on table "public"."daily_closings" to "authenticated";

grant delete on table "public"."daily_closings" to "service_role";

grant insert on table "public"."daily_closings" to "service_role";

grant references on table "public"."daily_closings" to "service_role";

grant select on table "public"."daily_closings" to "service_role";

grant trigger on table "public"."daily_closings" to "service_role";

grant truncate on table "public"."daily_closings" to "service_role";

grant update on table "public"."daily_closings" to "service_role";

grant delete on table "public"."forum_messages" to "anon";

grant insert on table "public"."forum_messages" to "anon";

grant references on table "public"."forum_messages" to "anon";

grant select on table "public"."forum_messages" to "anon";

grant trigger on table "public"."forum_messages" to "anon";

grant truncate on table "public"."forum_messages" to "anon";

grant update on table "public"."forum_messages" to "anon";

grant delete on table "public"."forum_messages" to "authenticated";

grant insert on table "public"."forum_messages" to "authenticated";

grant references on table "public"."forum_messages" to "authenticated";

grant select on table "public"."forum_messages" to "authenticated";

grant trigger on table "public"."forum_messages" to "authenticated";

grant truncate on table "public"."forum_messages" to "authenticated";

grant update on table "public"."forum_messages" to "authenticated";

grant delete on table "public"."forum_messages" to "service_role";

grant insert on table "public"."forum_messages" to "service_role";

grant references on table "public"."forum_messages" to "service_role";

grant select on table "public"."forum_messages" to "service_role";

grant trigger on table "public"."forum_messages" to "service_role";

grant truncate on table "public"."forum_messages" to "service_role";

grant update on table "public"."forum_messages" to "service_role";

grant delete on table "public"."invoice_items" to "anon";

grant insert on table "public"."invoice_items" to "anon";

grant references on table "public"."invoice_items" to "anon";

grant select on table "public"."invoice_items" to "anon";

grant trigger on table "public"."invoice_items" to "anon";

grant truncate on table "public"."invoice_items" to "anon";

grant update on table "public"."invoice_items" to "anon";

grant delete on table "public"."invoice_items" to "authenticated";

grant insert on table "public"."invoice_items" to "authenticated";

grant references on table "public"."invoice_items" to "authenticated";

grant select on table "public"."invoice_items" to "authenticated";

grant trigger on table "public"."invoice_items" to "authenticated";

grant truncate on table "public"."invoice_items" to "authenticated";

grant update on table "public"."invoice_items" to "authenticated";

grant delete on table "public"."invoice_items" to "service_role";

grant insert on table "public"."invoice_items" to "service_role";

grant references on table "public"."invoice_items" to "service_role";

grant select on table "public"."invoice_items" to "service_role";

grant trigger on table "public"."invoice_items" to "service_role";

grant truncate on table "public"."invoice_items" to "service_role";

grant update on table "public"."invoice_items" to "service_role";

grant delete on table "public"."invoices" to "anon";

grant insert on table "public"."invoices" to "anon";

grant references on table "public"."invoices" to "anon";

grant select on table "public"."invoices" to "anon";

grant trigger on table "public"."invoices" to "anon";

grant truncate on table "public"."invoices" to "anon";

grant update on table "public"."invoices" to "anon";

grant delete on table "public"."invoices" to "authenticated";

grant insert on table "public"."invoices" to "authenticated";

grant references on table "public"."invoices" to "authenticated";

grant select on table "public"."invoices" to "authenticated";

grant trigger on table "public"."invoices" to "authenticated";

grant truncate on table "public"."invoices" to "authenticated";

grant update on table "public"."invoices" to "authenticated";

grant delete on table "public"."invoices" to "service_role";

grant insert on table "public"."invoices" to "service_role";

grant references on table "public"."invoices" to "service_role";

grant select on table "public"."invoices" to "service_role";

grant trigger on table "public"."invoices" to "service_role";

grant truncate on table "public"."invoices" to "service_role";

grant update on table "public"."invoices" to "service_role";

grant delete on table "public"."magasins" to "anon";

grant insert on table "public"."magasins" to "anon";

grant references on table "public"."magasins" to "anon";

grant select on table "public"."magasins" to "anon";

grant trigger on table "public"."magasins" to "anon";

grant truncate on table "public"."magasins" to "anon";

grant update on table "public"."magasins" to "anon";

grant delete on table "public"."magasins" to "authenticated";

grant insert on table "public"."magasins" to "authenticated";

grant references on table "public"."magasins" to "authenticated";

grant select on table "public"."magasins" to "authenticated";

grant trigger on table "public"."magasins" to "authenticated";

grant truncate on table "public"."magasins" to "authenticated";

grant update on table "public"."magasins" to "authenticated";

grant delete on table "public"."magasins" to "service_role";

grant insert on table "public"."magasins" to "service_role";

grant references on table "public"."magasins" to "service_role";

grant select on table "public"."magasins" to "service_role";

grant trigger on table "public"."magasins" to "service_role";

grant truncate on table "public"."magasins" to "service_role";

grant update on table "public"."magasins" to "service_role";

grant delete on table "public"."payments" to "anon";

grant insert on table "public"."payments" to "anon";

grant references on table "public"."payments" to "anon";

grant select on table "public"."payments" to "anon";

grant trigger on table "public"."payments" to "anon";

grant truncate on table "public"."payments" to "anon";

grant update on table "public"."payments" to "anon";

grant delete on table "public"."payments" to "authenticated";

grant insert on table "public"."payments" to "authenticated";

grant references on table "public"."payments" to "authenticated";

grant select on table "public"."payments" to "authenticated";

grant trigger on table "public"."payments" to "authenticated";

grant truncate on table "public"."payments" to "authenticated";

grant update on table "public"."payments" to "authenticated";

grant delete on table "public"."payments" to "service_role";

grant insert on table "public"."payments" to "service_role";

grant references on table "public"."payments" to "service_role";

grant select on table "public"."payments" to "service_role";

grant trigger on table "public"."payments" to "service_role";

grant truncate on table "public"."payments" to "service_role";

grant update on table "public"."payments" to "service_role";

grant delete on table "public"."product_types" to "anon";

grant insert on table "public"."product_types" to "anon";

grant references on table "public"."product_types" to "anon";

grant select on table "public"."product_types" to "anon";

grant trigger on table "public"."product_types" to "anon";

grant truncate on table "public"."product_types" to "anon";

grant update on table "public"."product_types" to "anon";

grant delete on table "public"."product_types" to "authenticated";

grant insert on table "public"."product_types" to "authenticated";

grant references on table "public"."product_types" to "authenticated";

grant select on table "public"."product_types" to "authenticated";

grant trigger on table "public"."product_types" to "authenticated";

grant truncate on table "public"."product_types" to "authenticated";

grant update on table "public"."product_types" to "authenticated";

grant delete on table "public"."product_types" to "service_role";

grant insert on table "public"."product_types" to "service_role";

grant references on table "public"."product_types" to "service_role";

grant select on table "public"."product_types" to "service_role";

grant trigger on table "public"."product_types" to "service_role";

grant truncate on table "public"."product_types" to "service_role";

grant update on table "public"."product_types" to "service_role";

grant delete on table "public"."products_carreaux" to "anon";

grant insert on table "public"."products_carreaux" to "anon";

grant references on table "public"."products_carreaux" to "anon";

grant select on table "public"."products_carreaux" to "anon";

grant trigger on table "public"."products_carreaux" to "anon";

grant truncate on table "public"."products_carreaux" to "anon";

grant update on table "public"."products_carreaux" to "anon";

grant delete on table "public"."products_carreaux" to "authenticated";

grant insert on table "public"."products_carreaux" to "authenticated";

grant references on table "public"."products_carreaux" to "authenticated";

grant select on table "public"."products_carreaux" to "authenticated";

grant trigger on table "public"."products_carreaux" to "authenticated";

grant truncate on table "public"."products_carreaux" to "authenticated";

grant update on table "public"."products_carreaux" to "authenticated";

grant delete on table "public"."products_carreaux" to "service_role";

grant insert on table "public"."products_carreaux" to "service_role";

grant references on table "public"."products_carreaux" to "service_role";

grant select on table "public"."products_carreaux" to "service_role";

grant trigger on table "public"."products_carreaux" to "service_role";

grant truncate on table "public"."products_carreaux" to "service_role";

grant update on table "public"."products_carreaux" to "service_role";

grant delete on table "public"."stocks" to "anon";

grant insert on table "public"."stocks" to "anon";

grant references on table "public"."stocks" to "anon";

grant select on table "public"."stocks" to "anon";

grant trigger on table "public"."stocks" to "anon";

grant truncate on table "public"."stocks" to "anon";

grant update on table "public"."stocks" to "anon";

grant delete on table "public"."stocks" to "authenticated";

grant insert on table "public"."stocks" to "authenticated";

grant references on table "public"."stocks" to "authenticated";

grant select on table "public"."stocks" to "authenticated";

grant trigger on table "public"."stocks" to "authenticated";

grant truncate on table "public"."stocks" to "authenticated";

grant update on table "public"."stocks" to "authenticated";

grant delete on table "public"."stocks" to "service_role";

grant insert on table "public"."stocks" to "service_role";

grant references on table "public"."stocks" to "service_role";

grant select on table "public"."stocks" to "service_role";

grant trigger on table "public"."stocks" to "service_role";

grant truncate on table "public"."stocks" to "service_role";

grant update on table "public"."stocks" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

CREATE TRIGGER trg_cash_transactions_updated_at BEFORE UPDATE ON public.cash_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER company_settings_updated_at_trigger BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION update_company_settings_updated_at();

CREATE TRIGGER trg_daily_closings_updated_at BEFORE UPDATE ON public.daily_closings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_payments_updated_at();


