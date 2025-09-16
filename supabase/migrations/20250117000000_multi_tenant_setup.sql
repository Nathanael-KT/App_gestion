-- Migration for Multi-Tenant System Implementation
-- Create comprehensive companies table and add missing company_id fields

-- 1. Create companies table with comprehensive business information
CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "email" text not null,
    "phone" text,
    "address" text,
    "website" text,
    "siret" text,
    "logo_url" text,
    "status" text not null default 'active',
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "settings" jsonb default '{}'::jsonb
);

-- Add primary key and constraints
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_email_key" UNIQUE ("email");
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_siret_key" UNIQUE ("siret");
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_status_check" 
    CHECK ("status" IN ('active', 'inactive', 'suspended'));

-- Add indexes for performance
CREATE INDEX "idx_companies_status" ON "public"."companies" ("status");
CREATE INDEX "idx_companies_created_at" ON "public"."companies" ("created_at");

-- 2. Add company_id to tables that don't have it yet
ALTER TABLE "public"."products_carreaux" ADD COLUMN IF NOT EXISTS "company_id" uuid;
ALTER TABLE "public"."product_types" ADD COLUMN IF NOT EXISTS "company_id" uuid;
ALTER TABLE "public"."stocks" ADD COLUMN IF NOT EXISTS "company_id" uuid;

-- 3. Add foreign key constraints for company isolation
ALTER TABLE "public"."magasins" 
    ADD CONSTRAINT "magasins_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "public"."users" 
    ADD CONSTRAINT "users_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "public"."company_settings" 
    ADD CONSTRAINT "company_settings_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "public"."products_carreaux" 
    ADD CONSTRAINT "products_carreaux_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "public"."product_types" 
    ADD CONSTRAINT "product_types_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "public"."stocks" 
    ADD CONSTRAINT "stocks_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

-- 4. Add indexes for company_id on all relevant tables for performance
CREATE INDEX IF NOT EXISTS "idx_magasins_company_id" ON "public"."magasins" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_users_company_id" ON "public"."users" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_company_settings_company_id" ON "public"."company_settings" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_products_carreaux_company_id" ON "public"."products_carreaux" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_product_types_company_id" ON "public"."product_types" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_stocks_company_id" ON "public"."stocks" ("company_id");

-- 5. Create trigger to update updated_at for companies
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at_trigger
    BEFORE UPDATE ON "public"."companies"
    FOR EACH ROW
    EXECUTE FUNCTION update_companies_updated_at();

-- 6. Insert default company for existing data
INSERT INTO "public"."companies" (
    "name",
    "email", 
    "phone",
    "address",
    "status"
) VALUES (
    'Entreprise Par Défaut',
    'contact@entreprise-defaut.com',
    '+33 1 23 45 67 89',
    '123 Rue de la Paix, 75001 Paris',
    'active'
) ON CONFLICT DO NOTHING;

-- 7. Update existing records to link them to the default company
-- Get the default company ID
DO $$
DECLARE
    default_company_id uuid;
BEGIN
    SELECT id INTO default_company_id 
    FROM "public"."companies" 
    WHERE email = 'contact@entreprise-defaut.com' 
    LIMIT 1;
    
    IF default_company_id IS NOT NULL THEN
        -- Update magasins
        UPDATE "public"."magasins" 
        SET company_id = default_company_id 
        WHERE company_id IS NULL;
        
        -- Update users
        UPDATE "public"."users" 
        SET company_id = default_company_id 
        WHERE company_id IS NULL;
        
        -- Update company_settings
        UPDATE "public"."company_settings" 
        SET company_id = default_company_id 
        WHERE company_id IS NULL;
        
        -- Update products_carreaux
        UPDATE "public"."products_carreaux" 
        SET company_id = default_company_id 
        WHERE company_id IS NULL;
        
        -- Update product_types
        UPDATE "public"."product_types" 
        SET company_id = default_company_id 
        WHERE company_id IS NULL;
        
        -- Update stocks
        UPDATE "public"."stocks" 
        SET company_id = default_company_id 
        WHERE company_id IS NULL;
    END IF;
END $$;

-- 8. Grant permissions for companies table
GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";

-- 9. Enable Row Level Security (RLS) for companies table
ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for companies - users can only see their own company
CREATE POLICY "Users can view their own company" ON "public"."companies"
    FOR SELECT USING (
        id IN (
            SELECT company_id 
            FROM "public"."users" 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage companies" ON "public"."companies"
    FOR ALL USING (
        EXISTS (
            SELECT 1 
            FROM "public"."users" 
            WHERE auth_user_id = auth.uid() 
            AND 'admin' = ANY(roles)
            AND company_id = companies.id
        )
    );