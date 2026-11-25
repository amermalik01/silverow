-- =============================================================================
-- Seed crm_sources so the prospect Source dropdown shows the former
-- built-in values plus any source already stored on prospects.
-- Only inserts names a company does not have yet. Safe to re-run.
-- =============================================================================

WITH defaults(name) AS (
  VALUES ('Website'), ('Referral'), ('Social Media'), ('Email Campaign'),
         ('Cold Call'), ('Trade Show'), ('Advertisement'), ('Other')
),
companies AS (
  SELECT DISTINCT company_id FROM public.prospects
  UNION
  SELECT DISTINCT company_id FROM public.crm_sources
),
wanted AS (
  SELECT c.company_id, d.name FROM companies c CROSS JOIN defaults d
  UNION
  SELECT DISTINCT p.company_id, TRIM(p.source)
  FROM public.prospects p
  WHERE p.source IS NOT NULL AND TRIM(p.source) <> ''
)
INSERT INTO public.crm_sources (company_id, name)
SELECT w.company_id, w.name
FROM wanted w
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_sources s
  WHERE s.company_id = w.company_id
    AND LOWER(s.name) = LOWER(w.name)
);
