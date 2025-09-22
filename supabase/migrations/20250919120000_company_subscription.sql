-- Table pour gérer l'abonnement et le paiement mensuel de chaque société
CREATE TABLE company_subscription (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES company(id) ON DELETE CASCADE,
    is_paid boolean DEFAULT false,
    next_due_date date,
    last_payment_date date,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Exemple d'utilisation :
-- Si is_paid = false OU next_due_date < CURRENT_DATE, la société est bloquée
-- Sinon, accès normal à l'application
