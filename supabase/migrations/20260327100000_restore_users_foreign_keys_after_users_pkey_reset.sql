-- Restore foreign keys referencing public.users(id)
-- Context: previous migrations dropped users_pkey with CASCADE,
-- which may have removed dependent foreign key constraints.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_cash_counts_counted_by'
      AND conrelid = 'public.cash_counts'::regclass
  ) THEN
    ALTER TABLE public.cash_counts
      ADD CONSTRAINT fk_cash_counts_counted_by
      FOREIGN KEY (counted_by)
      REFERENCES public.users(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

-- Nettoyer les références orphelines avant validation
UPDATE public.cash_counts cc
SET counted_by = NULL
WHERE counted_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = cc.counted_by
  );

ALTER TABLE public.cash_counts
  VALIDATE CONSTRAINT fk_cash_counts_counted_by;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_cash_emptying_emptied_by'
      AND conrelid = 'public.cash_emptying'::regclass
  ) THEN
    ALTER TABLE public.cash_emptying
      ADD CONSTRAINT fk_cash_emptying_emptied_by
      FOREIGN KEY (emptied_by)
      REFERENCES public.users(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

-- Nettoyer les références orphelines avant validation
UPDATE public.cash_emptying ce
SET emptied_by = NULL
WHERE emptied_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = ce.emptied_by
  );

ALTER TABLE public.cash_emptying
  VALIDATE CONSTRAINT fk_cash_emptying_emptied_by;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_cash_transactions_created_by'
      AND conrelid = 'public.cash_transactions'::regclass
  ) THEN
    ALTER TABLE public.cash_transactions
      ADD CONSTRAINT fk_cash_transactions_created_by
      FOREIGN KEY (created_by)
      REFERENCES public.users(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

-- Nettoyer les références orphelines avant validation
UPDATE public.cash_transactions ct
SET created_by = NULL
WHERE created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = ct.created_by
  );

ALTER TABLE public.cash_transactions
  VALIDATE CONSTRAINT fk_cash_transactions_created_by;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_daily_closings_closed_by'
      AND conrelid = 'public.daily_closings'::regclass
  ) THEN
    ALTER TABLE public.daily_closings
      ADD CONSTRAINT fk_daily_closings_closed_by
      FOREIGN KEY (closed_by)
      REFERENCES public.users(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

-- Nettoyer les références orphelines avant validation
UPDATE public.daily_closings dc
SET closed_by = NULL
WHERE closed_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = dc.closed_by
  );

ALTER TABLE public.daily_closings
  VALIDATE CONSTRAINT fk_daily_closings_closed_by;
