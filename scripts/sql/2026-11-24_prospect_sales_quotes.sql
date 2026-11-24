-- =============================================================================
-- Prospect offer -> Sales quote
--   * Sales quotes can belong to a prospect (no customer yet).
--   * Each prospect offer remembers the quote it was converted to.
-- Safe to re-run.
-- =============================================================================

-- 1. Quotes for prospects: link + customer becomes optional
ALTER TABLE public.sales_quotes
  ADD COLUMN IF NOT EXISTS prospect_id uuid
    REFERENCES public.prospects(id) ON DELETE SET NULL;

ALTER TABLE public.sales_quotes
  ALTER COLUMN customer_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS sales_quotes_prospect_idx
  ON public.sales_quotes (company_id, prospect_id)
  WHERE prospect_id IS NOT NULL;

-- Every quote needs either a customer or a prospect
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_quotes_customer_or_prospect_chk'
  ) THEN
    ALTER TABLE public.sales_quotes
      ADD CONSTRAINT sales_quotes_customer_or_prospect_chk
      CHECK (customer_id IS NOT NULL OR prospect_id IS NOT NULL);
  END IF;
END $$;

-- 2. Offer -> quote link
ALTER TABLE public.prospect_offers
  ADD COLUMN IF NOT EXISTS sales_quote_id uuid
    REFERENCES public.sales_quotes(id) ON DELETE SET NULL;

ALTER TABLE public.prospect_offers
  ADD COLUMN IF NOT EXISTS converted_to_quote_at timestamp without time zone;

CREATE INDEX IF NOT EXISTS prospect_offers_sales_quote_idx
  ON public.prospect_offers (sales_quote_id)
  WHERE sales_quote_id IS NOT NULL;
