// lib/services/global-search/global-search.service.ts

import type { QueryResultRow } from "pg";
import { pool } from "@/lib/db";

export type GlobalSearchType =
  | "party"
  | "item"
  | "sales_order"
  | "sales_invoice"
  | "purchase_order"
  | "credit_note"
  | "debit_note"
  | "journal_entry";

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchType;
  category: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: string | null;
  date: string | null;
  href: string;
}

interface GlobalSearchRow extends QueryResultRow {
  id: string;
  type: GlobalSearchType;
  category: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: string | null;
  date: string | null;
  href: string;
}

const MAX_TERM_LENGTH = 100;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

function normalizeSearchTerm(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_TERM_LENGTH);
}

function normalizeLimit(value?: number): number {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.floor(value), 5), MAX_LIMIT);
}

export class GlobalSearchService {
  /**
   * Searches records belonging to one company.
   *
   * The slug is intentionally not used to determine tenant access.
   * The company ID must come from the authenticated session.
   */
  static async search(
    companyId: string,
    rawSearchTerm: string,
    requestedLimit?: number,
  ): Promise<GlobalSearchResult[]> {
    const searchTerm = normalizeSearchTerm(rawSearchTerm);

    if (!companyId || searchTerm.length < 2) {
      return [];
    }

    const limit = normalizeLimit(requestedLimit);
    const searchPattern = `%${searchTerm}%`;

    const queryParams = [companyId, searchPattern, limit];

    const [
      partiesResult,
      itemsResult,
      salesOrdersResult,
      salesInvoicesResult,
      purchaseOrdersResult,
      creditNotesResult,
      debitNotesResult,
      journalsResult,
    ] = await Promise.all([
      // ---------------------------------------------------------
      // Parties: CRM leads, SRM vendors, customers and suppliers
      // ---------------------------------------------------------
      pool.query<GlobalSearchRow>(
        `
          SELECT
            p.id,
            'party'::text AS type,
            CASE
              WHEN p.is_customer AND p.is_supplier THEN 'Customer / Supplier'
              WHEN p.is_customer THEN 'Customer'
              WHEN p.is_supplier THEN 'Supplier'
              WHEN p.is_crm_lead THEN 'CRM Lead'
              WHEN p.is_srm_vendor THEN 'SRM Vendor'
              ELSE 'Party'
            END AS category,
            p.name AS title,
            COALESCE(
              NULLIF(p.customer_code, ''),
              NULLIF(p.supplier_code, ''),
              NULLIF(p.crm_code, ''),
              NULLIF(p.srm_code, '')
            ) AS subtitle,
            CONCAT_WS(
              ' · ',
              NULLIF(p.email, ''),
              NULLIF(p.phone, ''),
              NULLIF(p.mobile, '')
            ) AS description,
            p.status AS status,
            p.updated_at::date::text AS date,
            CASE
              WHEN p.is_customer THEN
                '/sales/customer/' || p.id::text
              WHEN p.is_supplier THEN
                '/suppliers/' || p.id::text
              WHEN p.is_crm_lead THEN
                '/crm/leads/' || p.id::text
              WHEN p.is_srm_vendor THEN
                '/srm/vendors/' || p.id::text
              ELSE
                '/parties/' || p.id::text
            END AS href
          FROM parties p
          WHERE p.company_id = $1
            AND (
              p.name ILIKE $2
              OR COALESCE(p.customer_code, '') ILIKE $2
              OR COALESCE(p.supplier_code, '') ILIKE $2
              OR COALESCE(p.crm_code, '') ILIKE $2
              OR COALESCE(p.srm_code, '') ILIKE $2
              OR COALESCE(p.email, '') ILIKE $2
              OR COALESCE(p.phone, '') ILIKE $2
              OR COALESCE(p.mobile, '') ILIKE $2
              OR COALESCE(p.vat_reg_no, '') ILIKE $2
              OR COALESCE(p.comp_reg_no, '') ILIKE $2
              OR COALESCE(p.company_reg_no, '') ILIKE $2
            )
          ORDER BY p.updated_at DESC NULLS LAST, p.name
          LIMIT $3
        `,
        queryParams,
      ),

      // ---------------------------------------------------------
      // Items
      // ---------------------------------------------------------
      pool.query<GlobalSearchRow>(
        `
          SELECT
            i.id,
            'item'::text AS type,
            'Item'::text AS category,
            i.name AS title,
            i.item_code AS subtitle,
            CONCAT_WS(
              ' · ',
              NULLIF(i.barcode, ''),
              NULLIF(i.description, '')
            ) AS description,
            CASE i.status
              WHEN 1 THEN 'Active'
              WHEN 2 THEN 'Inactive'
              WHEN 3 THEN 'Discontinued'
              ELSE i.status::text
            END AS status,
            i.updated_at::date::text AS date,
            '/inventory/items/' || i.id::text || '/edit' AS href
          FROM items i
          WHERE i.company_id = $1
            AND i.deleted_at IS NULL
            AND (
              i.name ILIKE $2
              OR COALESCE(i.item_code, '') ILIKE $2
              OR COALESCE(i.barcode, '') ILIKE $2
              OR COALESCE(i.description, '') ILIKE $2
              OR i.id::text ILIKE $2
            )
          ORDER BY i.updated_at DESC NULLS LAST, i.name
          LIMIT $3
        `,
        queryParams,
      ),

      // ---------------------------------------------------------
      // Sales orders
      // ---------------------------------------------------------
      pool.query<GlobalSearchRow>(
        `
          SELECT
            so.id,
            'sales_order'::text AS type,
            'Sales Order'::text AS category,
            so.order_no AS title,
            COALESCE(
              NULLIF(so.customer_name, ''),
              NULLIF(so.customer_no, '')
            ) AS subtitle,
            CONCAT_WS(
              ' · ',
              NULLIF(so.reference, ''),
              NULLIF(so.cust_order_no, ''),
              NULLIF(so.sales_quote_no, '')
            ) AS description,
            so.status::text AS status,
            so.order_date::text AS date,
            '/sales/orders/' || so.id::text || '/edit' AS href
          FROM sales_orders so
          WHERE so.company_id = $1
            AND (
              COALESCE(so.order_no, '') ILIKE $2
              OR COALESCE(so.customer_no, '') ILIKE $2
              OR COALESCE(so.customer_name, '') ILIKE $2
              OR COALESCE(so.reference, '') ILIKE $2
              OR COALESCE(so.cust_order_no, '') ILIKE $2
              OR COALESCE(so.sales_quote_no, '') ILIKE $2
              OR COALESCE(so.link_to_po, '') ILIKE $2
              OR so.id::text ILIKE $2
            )
          ORDER BY so.order_date DESC NULLS LAST, so.created_at DESC
          LIMIT $3
        `,
        queryParams,
      ),

      // ---------------------------------------------------------
      // Sales invoices
      // ---------------------------------------------------------
      pool.query<GlobalSearchRow>(
        `
          SELECT
            si.id,
            'sales_invoice'::text AS type,
            'Sales Invoice'::text AS category,
            si.invoice_no AS title,
            COALESCE(p.name, si.customer_id::text) AS subtitle,
            CONCAT_WS(
              ' · ',
              NULLIF(si.reference, ''),
              NULLIF(si.remarks, '')
            ) AS description,
            si.status AS status,
            si.invoice_date::text AS date,
            '/sales/invoices/' || si.id::text AS href
          FROM sales_invoices si
          LEFT JOIN parties p
            ON p.id = si.customer_id
            AND p.company_id = si.company_id
          WHERE si.company_id = $1
            AND (
              COALESCE(si.invoice_no, '') ILIKE $2
              OR COALESCE(si.reference, '') ILIKE $2
              OR COALESCE(si.remarks, '') ILIKE $2
              OR COALESCE(p.name, '') ILIKE $2
              OR si.id::text ILIKE $2
            )
          ORDER BY si.invoice_date DESC NULLS LAST, si.created_at DESC
          LIMIT $3
        `,
        queryParams,
      ),

      // ---------------------------------------------------------
      // Purchase orders (including supplier invoice references)
      // ---------------------------------------------------------
      pool.query<GlobalSearchRow>(
        `
          SELECT
            po.id,
            'purchase_order'::text AS type,
            'Purchase Order'::text AS category,
            po.order_no AS title,
            COALESCE(
              NULLIF(po.supplier_name, ''),
              NULLIF(po.supplier_no, ''),
              NULLIF(po.pay_to_supplier_name, '')
            ) AS subtitle,
            CONCAT_WS(
              ' · ',
              NULLIF(po.reference, ''),
              NULLIF(po.supp_order_no, ''),
              NULLIF(po.supplier_invoice_no, ''),
              NULLIF(po.purchase_invoice_no, '')
            ) AS description,
            po.status::text AS status,
            po.order_date::text AS date,
            '/purchase/orders/' || po.id::text || '/edit' AS href
          FROM purchase_orders po
          WHERE po.company_id = $1
            AND (
              COALESCE(po.order_no, '') ILIKE $2
              OR COALESCE(po.supplier_no, '') ILIKE $2
              OR COALESCE(po.supplier_name, '') ILIKE $2
              OR COALESCE(po.pay_to_supplier_no, '') ILIKE $2
              OR COALESCE(po.pay_to_supplier_name, '') ILIKE $2
              OR COALESCE(po.reference, '') ILIKE $2
              OR COALESCE(po.supp_order_no, '') ILIKE $2
              OR COALESCE(po.supplier_invoice_no, '') ILIKE $2
              OR COALESCE(po.purchase_invoice_no, '') ILIKE $2
              OR COALESCE(po.linked_po, '') ILIKE $2
              OR po.id::text ILIKE $2
            )
          ORDER BY po.order_date DESC NULLS LAST, po.created_at DESC
          LIMIT $3
        `,
        queryParams,
      ),

      // ---------------------------------------------------------
      // Credit notes
      // ---------------------------------------------------------
      pool.query<GlobalSearchRow>(
        `
          SELECT
            cn.id,
            'credit_note'::text AS type,
            'Credit Note'::text AS category,
            COALESCE(
              NULLIF(cn.posted_credit_note_no, ''),
              cn.credit_note_no
            ) AS title,
            COALESCE(
              NULLIF(cn.customer_name, ''),
              NULLIF(cn.customer_no, '')
            ) AS subtitle,
            CONCAT_WS(
              ' · ',
              NULLIF(cn.reference, ''),
              NULLIF(cn.cust_return_no, ''),
              NULLIF(cn.cust_order_no, ''),
              NULLIF(cn.sales_invoice, '')
            ) AS description,
            cn.status::text AS status,
            cn.credit_note_date::text AS date,
            '/sales/credit-notes/' || cn.id::text AS href
          FROM credit_notes cn
          WHERE cn.company_id = $1
            AND (
              COALESCE(cn.credit_note_no, '') ILIKE $2
              OR COALESCE(cn.posted_credit_note_no, '') ILIKE $2
              OR COALESCE(cn.customer_no, '') ILIKE $2
              OR COALESCE(cn.customer_name, '') ILIKE $2
              OR COALESCE(cn.reference, '') ILIKE $2
              OR COALESCE(cn.cust_return_no, '') ILIKE $2
              OR COALESCE(cn.cust_order_no, '') ILIKE $2
              OR COALESCE(cn.sales_invoice, '') ILIKE $2
              OR cn.id::text ILIKE $2
            )
          ORDER BY cn.credit_note_date DESC NULLS LAST, cn.created_at DESC
          LIMIT $3
        `,
        queryParams,
      ),

      // ---------------------------------------------------------
      // Debit notes
      // ---------------------------------------------------------
      pool.query<GlobalSearchRow>(
        `
          SELECT
            dn.id,
            'debit_note'::text AS type,
            'Debit Note'::text AS category,
            dn.debit_note_no AS title,
            COALESCE(
              NULLIF(dn.supplier_name, ''),
              NULLIF(dn.supplier_no, ''),
              NULLIF(dn.pay_to_supplier_name, '')
            ) AS subtitle,
            CONCAT_WS(
              ' · ',
              NULLIF(dn.reference, ''),
              NULLIF(dn.supp_order_no, ''),
              NULLIF(dn.debit_note_invoice_no, ''),
              NULLIF(dn.apply_to_pi, ''),
              NULLIF(dn.linked_po, '')
            ) AS description,
            dn.status::text AS status,
            dn.document_date::text AS date,
            '/purchase/debit-notes/' || dn.id::text AS href
          FROM debit_notes dn
          WHERE dn.company_id = $1
            AND (
              COALESCE(dn.debit_note_no, '') ILIKE $2
              OR COALESCE(dn.supplier_no, '') ILIKE $2
              OR COALESCE(dn.supplier_name, '') ILIKE $2
              OR COALESCE(dn.pay_to_supplier_no, '') ILIKE $2
              OR COALESCE(dn.pay_to_supplier_name, '') ILIKE $2
              OR COALESCE(dn.reference, '') ILIKE $2
              OR COALESCE(dn.supp_order_no, '') ILIKE $2
              OR COALESCE(dn.debit_note_invoice_no, '') ILIKE $2
              OR COALESCE(dn.apply_to_pi, '') ILIKE $2
              OR COALESCE(dn.linked_po, '') ILIKE $2
              OR dn.id::text ILIKE $2
            )
          ORDER BY dn.document_date DESC NULLS LAST, dn.created_at DESC
          LIMIT $3
        `,
        queryParams,
      ),

      // ---------------------------------------------------------
      // Journal entries and their line-level references
      // ---------------------------------------------------------
      pool.query<GlobalSearchRow>(
        `
          SELECT
            je.id,
            'journal_entry'::text AS type,
            'Journal Entry'::text AS category,
            je.entry_no AS title,
            je.reference AS subtitle,
            je.description AS description,
            CASE
              WHEN je.is_posted THEN 'Posted'
              ELSE 'Unposted'
            END AS status,
            je.entry_date::text AS date,
            '/finance/journals/' || je.id::text AS href
          FROM journal_entries je
          WHERE je.company_id = $1
            AND (
              COALESCE(je.entry_no, '') ILIKE $2
              OR COALESCE(je.reference, '') ILIKE $2
              OR COALESCE(je.description, '') ILIKE $2
              OR COALESCE(je.journal_type, '') ILIKE $2
              OR je.id::text ILIKE $2
              OR EXISTS (
                SELECT 1
                FROM journal_entry_lines jel
                WHERE jel.journal_id = je.id
                  AND jel.company_id = je.company_id
                  AND (
                    COALESCE(jel.description, '') ILIKE $2
                    OR COALESCE(jel.document_no, '') ILIKE $2
                    OR COALESCE(jel.entry_no::text, '') ILIKE $2
                  )
              )
            )
          ORDER BY je.entry_date DESC NULLS LAST, je.created_at DESC
          LIMIT $3
        `,
        queryParams,
      ),
    ]);

    const results: GlobalSearchResult[] = [
      ...partiesResult.rows,
      ...itemsResult.rows,
      ...salesOrdersResult.rows,
      ...salesInvoicesResult.rows,
      ...purchaseOrdersResult.rows,
      ...creditNotesResult.rows,
      ...debitNotesResult.rows,
      ...journalsResult.rows,
    ];

    // Keep the result count bounded even when every module matches.
    return results.slice(0, limit);
  }
}
