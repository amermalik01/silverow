-- =============================================================================
-- Prospect "Interested Products" (Sales Information)
-- Kept separate from pricing offers. Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.prospect_interested_products (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL,
    prospect_id  uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,

    item_id      uuid REFERENCES public.items(id) ON DELETE SET NULL,
    -- snapshots, so the list still reads correctly if the item changes
    item_code    varchar(100),
    item_name    varchar(255) NOT NULL,

    sort_order   integer NOT NULL DEFAULT 0,
    created_at   timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prospect_interested_products_prospect_idx
    ON public.prospect_interested_products (company_id, prospect_id);

-- One row per item per prospect
CREATE UNIQUE INDEX IF NOT EXISTS prospect_interested_products_item_uq
    ON public.prospect_interested_products (prospect_id, item_id)
    WHERE item_id IS NOT NULL;
