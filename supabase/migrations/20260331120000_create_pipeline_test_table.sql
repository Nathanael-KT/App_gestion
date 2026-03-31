-- Simple migration to validate CI/CD database migration step.
CREATE TABLE IF NOT EXISTS public.pipeline_test (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
