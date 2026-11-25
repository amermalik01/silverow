-- =============================================================================
-- Attachment folders, configurable per module ("scope").
--   scope = 'parties' for crm / srm / customer / supplier / finance records,
--   otherwise the attachment module key (e.g. 'prospect', 'sales_order').
-- Default folders are created automatically the first time a scope is used.
-- Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.attachment_folders (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL,
    scope       varchar(100) NOT NULL,
    name        varchar(100) NOT NULL,
    sort_order  integer NOT NULL DEFAULT 0,
    created_by  uuid,
    created_at  timestamp without time zone NOT NULL DEFAULT now(),
    updated_at  timestamp without time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS attachment_folders_scope_name_uq
    ON public.attachment_folders (company_id, scope, LOWER(name));

CREATE INDEX IF NOT EXISTS attachment_folders_scope_idx
    ON public.attachment_folders (company_id, scope, sort_order);

-- Faster folder counts / renames
CREATE INDEX IF NOT EXISTS attachments_company_module_folder_idx
    ON public.attachments (company_id, module, folder);
