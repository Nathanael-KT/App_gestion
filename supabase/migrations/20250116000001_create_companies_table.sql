-- Create companies table for multi-tenant support
create table "public"."companies" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "email" text not null,
    "siret" text,
    "address" text,
    "phone" text,
    "website" text,
    "logo_url" text,
    "subscription_plan" text default 'basic'::text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

-- Add primary key and unique constraints
alter table "public"."companies" add constraint "companies_pkey" PRIMARY KEY (id);
alter table "public"."companies" add constraint "companies_email_key" UNIQUE (email);
alter table "public"."companies" add constraint "companies_siret_key" UNIQUE (siret);

-- Add indexes for performance
create index "idx_companies_name" on public.companies using btree (name);
create index "idx_companies_email" on public.companies using btree (email);
create index "idx_companies_is_active" on public.companies using btree (is_active);

-- Add check constraints
alter table "public"."companies" add constraint "companies_subscription_plan_check" 
CHECK (subscription_plan = ANY (ARRAY['basic'::text, 'premium'::text, 'enterprise'::text]));

-- Add foreign key constraint to company_settings
alter table "public"."company_settings" add constraint "company_settings_company_id_fkey" 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Add foreign key constraint to magasins
alter table "public"."magasins" add constraint "magasins_company_id_fkey" 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Add foreign key constraint to users
alter table "public"."users" add constraint "users_company_id_fkey" 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- Add company_id to tables that don't have it yet
alter table "public"."products_carreaux" add column "company_id" uuid;
alter table "public"."products_carreaux" add constraint "products_carreaux_company_id_fkey" 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Add indexes for company_id fields for better performance
create index "idx_company_settings_company_id" on public.company_settings using btree (company_id);
create index "idx_magasins_company_id" on public.magasins using btree (company_id);
create index "idx_users_company_id" on public.users using btree (company_id);
create index "idx_products_carreaux_company_id" on public.products_carreaux using btree (company_id);

-- Update trigger to handle updated_at
CREATE OR REPLACE FUNCTION public.update_companies_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER companies_updated_at_trigger 
BEFORE UPDATE ON public.companies 
FOR EACH ROW EXECUTE FUNCTION update_companies_updated_at();

-- Grant permissions
grant delete on table "public"."companies" to "anon";
grant insert on table "public"."companies" to "anon";
grant references on table "public"."companies" to "anon";
grant select on table "public"."companies" to "anon";
grant trigger on table "public"."companies" to "anon";
grant truncate on table "public"."companies" to "anon";
grant update on table "public"."companies" to "anon";

grant delete on table "public"."companies" to "authenticated";
grant insert on table "public"."companies" to "authenticated";
grant references on table "public"."companies" to "authenticated";
grant select on table "public"."companies" to "authenticated";
grant trigger on table "public"."companies" to "authenticated";
grant truncate on table "public"."companies" to "authenticated";
grant update on table "public"."companies" to "authenticated";

grant delete on table "public"."companies" to "service_role";
grant insert on table "public"."companies" to "service_role";
grant references on table "public"."companies" to "service_role";
grant select on table "public"."companies" to "service_role";
grant trigger on table "public"."companies" to "service_role";
grant truncate on table "public"."companies" to "service_role";
grant update on table "public"."companies" to "service_role";