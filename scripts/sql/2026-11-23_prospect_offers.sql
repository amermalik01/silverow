-- =============================================================================
-- Prospect offers (pricing) — tables + numbering sequence
-- Matches ProspectOffer / ProspectOfferLine in types/prospect.ts.
-- Safe to re-run: every statement is IF NOT EXISTS / NOT EXISTS guarded,
-- so if you already created these tables nothing is changed.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.prospect_offers (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      uuid NOT NULL,
    prospect_id     uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
    offer_no        varchar(50) NOT NULL,

    offer_date      date NOT NULL DEFAULT CURRENT_DATE,
    valid_until     date,

    status          varchar(20) NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','CANCELLED')),

    currency_id     uuid NOT NULL REFERENCES public.currencies(id),
    exchange_rate   numeric(18,6) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),

    subtotal        numeric(18,2) NOT NULL DEFAULT 0,
    discount_total  numeric(18,2) NOT NULL DEFAULT 0,
    taxable_amount  numeric(18,2) NOT NULL DEFAULT 0,
    vat_total       numeric(18,2) NOT NULL DEFAULT 0,
    grand_total     numeric(18,2) NOT NULL DEFAULT 0,

    is_primary      boolean NOT NULL DEFAULT false,
    notes           text,

    created_by      uuid,
    updated_by      uuid,
    created_at      timestamp without time zone NOT NULL DEFAULT now(),
    updated_at      timestamp without time zone NOT NULL DEFAULT now(),

    CONSTRAINT prospect_offers_company_offer_no_key UNIQUE (company_id, offer_no)
);

CREATE INDEX IF NOT EXISTS prospect_offers_prospect_idx
    ON public.prospect_offers (company_id, prospect_id);

-- Only one primary offer per prospect
CREATE UNIQUE INDEX IF NOT EXISTS prospect_offers_one_primary_idx
    ON public.prospect_offers (prospect_id)
    WHERE is_primary;

CREATE TABLE IF NOT EXISTS public.prospect_offer_lines (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id              uuid NOT NULL REFERENCES public.prospect_offers(id) ON DELETE CASCADE,
    company_id            uuid NOT NULL,
    line_no               integer NOT NULL,

    item_id               uuid REFERENCES public.items(id),
    item_code             varchar(100),
    item_name             varchar(255) NOT NULL,
    description           text,

    uom_id                uuid,
    uom_code              varchar(50),
    uom_name              varchar(100),

    quantity              numeric(18,4) NOT NULL CHECK (quantity > 0),
    unit_price            numeric(18,4) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),

    discount_type         varchar(20) NOT NULL DEFAULT 'PERCENTAGE'
                          CHECK (discount_type IN ('PERCENTAGE','AMOUNT')),
    discount_value        numeric(18,4) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
    discount_amount       numeric(18,2) NOT NULL DEFAULT 0,

    vat_product_group_id  uuid,
    vat_posting_setup_id  uuid,
    sales_vat_account_id  uuid,

    vat_rate              numeric(9,4)  NOT NULL DEFAULT 0,
    line_subtotal         numeric(18,2) NOT NULL DEFAULT 0,
    vat_amount            numeric(18,2) NOT NULL DEFAULT 0,
    line_total            numeric(18,2) NOT NULL DEFAULT 0,

    created_at            timestamp without time zone NOT NULL DEFAULT now(),
    updated_at            timestamp without time zone NOT NULL DEFAULT now(),

    CONSTRAINT prospect_offer_lines_offer_line_key UNIQUE (offer_id, line_no)
);

CREATE INDEX IF NOT EXISTS prospect_offer_lines_offer_idx
    ON public.prospect_offer_lines (offer_id);

-- -----------------------------------------------------------------------------
-- Numbering: get_next_sequence(company_id, 'prospect_offer')
-- -----------------------------------------------------------------------------

-- Template for companies created in future (used by lib/bootstrap/sequences.ts)
INSERT INTO public.ref_modules (name, display_name, default_prefix, default_start, default_padding, status)
SELECT 'prospect_offer', 'Prospect Offer', 'OFR-', 1, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.ref_modules WHERE name = 'prospect_offer');

-- Existing companies
INSERT INTO public.sequences (company_id, module, display_name, prefix, current_value, padding)
SELECT c.company_id, 'prospect_offer', 'Prospect Offer', 'OFR-', 0, 5
FROM (SELECT DISTINCT company_id FROM public.sequences) c
ON CONFLICT (company_id, module) DO NOTHING;
