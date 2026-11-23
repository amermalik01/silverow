-- ROLLBACK: the "location type" field was dropped from prospect addresses.
-- Run this ONLY if you already ran the earlier version of this script
-- (which added prospect_addresses.address_type). Otherwise just delete this file.

ALTER TABLE public.prospect_addresses
  DROP CONSTRAINT IF EXISTS prospect_addresses_address_type_chk;

ALTER TABLE public.prospect_addresses
  DROP COLUMN IF EXISTS address_type;
