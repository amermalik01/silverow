// lib/services/parties/party.service.ts

import { pool } from "@/lib/db";
import { FetchParams, FetchResponse } from "@/types/table";
import { z } from "zod";
import {
  PartySchema,
  PartyContactSchema,
  PartyAddressSchema,
} from "@/lib/validations/party.schema";

export type PartyInput = z.infer<typeof PartySchema>;
export type PartyContactInput = z.infer<typeof PartyContactSchema>;
export type PartyAddressInput = z.infer<typeof PartyAddressSchema>;

export type PartyRecord = {
  // Core Identification & Scope
  id: string;
  company_id: string;
  name: string;
  type?: string | null;
  status: "active" | "inactive" | "prospect" | "suspended" | string;

  // Role Flags
  is_crm_lead: boolean;
  is_srm_vendor: boolean;
  is_customer: boolean;
  is_supplier: boolean;

  // Lifecycle Codes
  crm_code?: string | null;
  srm_code?: string | null;
  customer_code?: string | null;
  supplier_code?: string | null;

  // Primary Contact Info
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  website?: string | null;

  // Financial & Sales Controls
  credit_limit: number;
  currency_id?: string | null;
  currency_code?: string | null; // Joined from currencies table if present
  salesperson_id?: string | null;
  bucket_id?: string | null;
  sales_posting_group_id?: string | null;
  purchase_posting_group_id?: string | null;

  vat_reg_no?: string | null;
  segment_id?: string | null;
  territory_id?: string | null;
  buying_group_id?: string | null;
  credit_rating_id?: string | null;
  ownership_type_id?: string | null;
  classification_id?: string | null;
  type_id?: string | null;
  status_id?: string | null;
  source_of_crm_id?: string | null;
  no_of_emp: number;
  turnover: number;
  comp_reg_no?: string | null;
  company_reg_no?: string | null;
  date_of_inc?: string | Date | null;
  additional_information?: string | null;
  assign_person_id?: string | null;
  assign_person?: string | null;
  anonymous_supplier: boolean;
  anonymous_customer: boolean;

  // Finance Contact Details
  finance_contact_person?: string | null;
  finance_email?: string | null;
  finance_phone?: string | null;
  finance_fax?: string | null;
  finance_alt_contact?: string | null;
  finance_alt_email?: string | null;

  // Payment & Banking Rules
  payment_terms?: string | null;
  payment_method?: string | null;
  supplier_vat_no?: string | null;
  payable_bank?: string | null;

  // General Ledger & Control Settings
  gl_account_receivable?: string | null;
  gl_account_payable?: string | null;
  posting_group?: string | null;

  // Charges & Aging Exclusion
  finance_charge?: string | null;
  has_finance_charge: boolean;
  insurance_charge?: string | null;
  has_insurance_charge: boolean;
  exclude_from_aging_report: boolean;

  // E-Document Generation Flags
  e_reminder: boolean;
  e_statement: boolean;
  e_invoice: boolean;
  e_purchase_order: boolean;
  e_debit_note: boolean;
  e_remittance_advice: boolean;

  // Bank Account Details
  bank_account_name?: string | null;
  bank_sort_code?: string | null;
  bank_account_no?: string | null;
  bank_swift_bic?: string | null;
  bank_iban?: string | null;
  bank_name?: string | null;
  bank_address?: string | null;

  created_at: string | Date;
  updated_at: string | Date;

  // Flattened Subquery Outputs
  primaryc_name?: string | null;
  primaryc_email?: string | null;
  primaryc_phone?: string | null;
  primary_city?: string | null;
  country?: string | null;
};

export class PartyService {
  /**
   * Paginated listing endpoint for DataTable server-side integration.
   * Flattens primary contacts & city/county for direct table viewing.
   */
  static async listPaginated(
    companyId: string,
    role: string,
    params: FetchParams,
  ): Promise<FetchResponse<PartyRecord>> {
    const client = await pool.connect();

    try {
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const search = params.search ?? "";
      const sortColumn = params.sortColumn;
      const sortOrder = params.sortOrder;

      const offset = (page - 1) * pageSize;
      const allowedRoles = [
        "is_crm_lead",
        "is_srm_vendor",
        "is_customer",
        "is_supplier",
      ];

      const whereClauses: string[] = ["p.company_id = $1"];
      const queryValues: unknown[] = [companyId];
      let paramIdx = 2;

      // Role Filter Validation
      if (role && allowedRoles.includes(role)) {
        whereClauses.push(`p.${role} = true`);
      }

      // Search Filter Across Code, Metadata, and Primary Contacts
      if (search.trim()) {
        const searchPattern = `%${search.trim()}%`;
        whereClauses.push(`(
          p.name ILIKE $${paramIdx} OR
          p.crm_code ILIKE $${paramIdx} OR
          p.srm_code ILIKE $${paramIdx} OR
          p.customer_code ILIKE $${paramIdx} OR
          p.supplier_code ILIKE $${paramIdx} OR
          p.email ILIKE $${paramIdx} OR
          p.phone ILIKE $${paramIdx} OR
          p.vat_reg_no ILIKE $${paramIdx} OR
          pc.name ILIKE $${paramIdx} OR
          pa.city ILIKE $${paramIdx}
        )`);
        queryValues.push(searchPattern);
        paramIdx++;
      }

      const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

      // Dynamic Column Sorting Protection
      const validSortColumns: Record<string, string> = {
        code: "p.created_at",
        name: "p.name",
        type: "p.type",
        status: "p.status",
        email: "p.email",
        phone: "p.phone",
        credit_limit: "p.credit_limit",
        turnover: "p.turnover",
        no_of_emp: "p.no_of_emp",
        payment_terms: "p.payment_terms",
        posting_group: "p.posting_group",
        primary_city: "pa.city",
        country: "pa.country",
        primaryc_name: "pc.name",
        primaryc_email: "pc.email",
        primaryc_phone: "pc.phone",
        created_at: "p.created_at",
        updated_at: "p.updated_at",
      };

      const orderByColumn =
        sortColumn && validSortColumns[sortColumn]
          ? validSortColumns[sortColumn]
          : "p.created_at";

      const orderDirection =
        sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

      const dataQuery = `
        SELECT 
          p.id,
          p.company_id,
          p.name,
          p.type,
          p.status,
          p.is_crm_lead,
          p.is_srm_vendor,
          p.is_customer,
          p.is_supplier,
          p.crm_code,
          p.srm_code,
          p.customer_code,
          p.supplier_code,
          p.email,
          p.phone,
          p.mobile,
          p.website,
          p.credit_limit,
          p.currency_id,
          cur.code AS currency_code,
          p.salesperson_id,
          p.bucket_id,
          p.sales_posting_group_id,
          p.purchase_posting_group_id,
          p.vat_reg_no,
          p.segment_id,
          p.territory_id,
          p.buying_group_id,
          p.credit_rating_id,
          p.ownership_type_id,
          p.classification_id,
          p.type_id,
          p.status_id,
          p.source_of_crm_id,
          p.no_of_emp,
          p.turnover,
          p.comp_reg_no,
          p.company_reg_no,
          p.date_of_inc,
          p.additional_information,
          p.assign_person_id,
          p.assign_person,
          p.anonymous_supplier,
          p.anonymous_customer,
          p.finance_contact_person,
          p.finance_email,
          p.finance_phone,
          p.finance_fax,
          p.finance_alt_contact,
          p.finance_alt_email,
          p.payment_terms,
          p.payment_method,
          p.supplier_vat_no,
          p.payable_bank,
          p.gl_account_receivable,
          p.gl_account_payable,
          p.posting_group,
          p.finance_charge,
          p.has_finance_charge,
          p.insurance_charge,
          p.has_insurance_charge,
          p.exclude_from_aging_report,
          p.e_reminder,
          p.e_statement,
          p.e_invoice,
          p.e_purchase_order,
          p.e_debit_note,
          p.e_remittance_advice,
          p.bank_account_name,
          p.bank_sort_code,
          p.bank_account_no,
          p.bank_swift_bic,
          p.bank_iban,
          p.bank_name,
          p.bank_address,
          p.created_at,
          p.updated_at,
          pc.name AS primaryc_name,
          pc.email AS primaryc_email,
          pc.phone AS primaryc_phone,
          pa.city AS primary_city,
          pa.country AS country
        FROM parties p
        LEFT JOIN currencies cur ON cur.id = p.currency_id
        LEFT JOIN LATERAL (
          SELECT name, email, phone 
          FROM party_contacts 
          WHERE party_id = p.id 
          ORDER BY is_primary DESC, id ASC 
          LIMIT 1
        ) pc ON true
        LEFT JOIN LATERAL (
          SELECT city, country 
          FROM party_addresses 
          WHERE party_id = p.id 
          ORDER BY is_primary DESC, id ASC 
          LIMIT 1
        ) pa ON true
        ${whereSql}
        ORDER BY ${orderByColumn} ${orderDirection}
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
      `;

     const totalQuery = `
        SELECT COUNT(p.id)::int AS count 
        FROM parties p
        ${whereSql}
      `;

      const dataValues = [...queryValues, pageSize, offset];

      const [dataRes, countRes] = await Promise.all([
        client.query<PartyRecord>(dataQuery, dataValues),
        client.query<{ count: number }>(totalQuery, queryValues),
      ]);

      return {
        data: dataRes.rows,
        totalRecords: countRes.rows[0]?.count ?? 0,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Fetches full Party Aggregate Record with Joined COA Accounts,
   * Contacts, and Addresses by Party ID and Company Context.
   */
  static async getById(id: string, companyId: string) {
    const client = await pool.connect();

    try {
      const partyRes = await client.query(
        `
        SELECT 
          p.*,
          ar.code AS gl_account_receivable_code,
          ar.name AS gl_account_receivable_name,
          ap.code AS gl_account_payable_code,
          ap.name AS gl_account_payable_name
        FROM parties p
        LEFT JOIN chart_of_accounts ar 
          ON NULLIF(p.gl_account_receivable, '')::uuid = ar.id
        LEFT JOIN chart_of_accounts ap 
          ON NULLIF(p.gl_account_payable, '')::uuid = ap.id
        WHERE p.id = $1 AND p.company_id = $2
        `,
        [id, companyId],
      );

      if (!partyRes.rows[0]) return null;

      const contactsRes = await client.query(
        `SELECT * FROM party_contacts WHERE party_id = $1 ORDER BY is_primary DESC, id ASC`,
        [id],
      );

      const addressesRes = await client.query(
        `SELECT * FROM party_addresses WHERE party_id = $1 ORDER BY is_primary DESC, id ASC`,
        [id],
      );

      return {
        account: partyRes.rows[0],
        contacts: contactsRes.rows,
        addresses: addressesRes.rows,
      };
    } finally {
      client.release();
    }
  }
}
