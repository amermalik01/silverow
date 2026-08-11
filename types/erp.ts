// types/erp.ts

import { z } from "zod";
import { PartySchema } from "@/lib/validations/party.schema";

export type Party = z.infer<typeof PartySchema>;
export type PartyType = "customer" | "supplier" | "lead" | "vendor" | "both";
export type PartyModule = "crm" | "srm" | "hr" | "procurement" | "customer" | "supplier" | "finance";

export interface PartyContact {
  id: string;
  party_id: string;
  name: string;
  job_title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  is_primary: boolean;
  notes?: string;
}

export type PartyContactDraft = {
  id?: string;
  party_id?: string;
  name: string;
  job_title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  notes?: string;
  is_primary: boolean;
};

export interface PartyAddress {
  id: string;
  party_id: string;
  label?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  country?: string | null;
  country_id?: string | null;
  postcode?: string;
  phone?: string;
  email?: string;
  is_primary?: boolean;
  is_billing?: boolean;
  is_shipping?: boolean;
}

export type PartyAddressDraft = {
  id?: string;
  party_id?: string;
  label?: string;
  address_1: string;
  address_2?: string;
  city?: string;
  state?: string; // Maps to County / State input field
  country?: string | null;
  country_id?: string | null;
  postcode?: string;
  phone?: string;
  email?: string;
  is_primary: boolean;
  is_billing?: boolean;
  is_shipping?: boolean;
  is_collection?: boolean; // 🟢 Added for Supplier Module collection location flag
};

export type PartyDraft = {
  id?: string;
  company_id: string;
  name: string;
  status: "active" | "inactive" | "prospect" | "suspended";
  
  // Role Flags Matrix
  is_crm_lead: boolean;
  is_srm_vendor: boolean;
  is_customer: boolean;
  is_supplier: boolean;

  // Legacy ERP System Alpha-Tracking Keys
  crm_code?: string | null;
  srm_code?: string | null;
  customer_code?: string | null;
  supplier_code?: string | null;

  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  website?: string | null;
  country?: string | null;

  // Ledger Control Pointers
  credit_limit?: number;
  currency_id?: string | null; // Changed to string to accept safe UUID formats
  salesperson_id?: string | null;
  
  sales_posting_group_id?: string | null;   // 🟢 Critical for Customer G/L Control Group routing
  purchase_posting_group_id?: string | null; // 🟢 Critical for Supplier G/L Control Group routing

  // 🟢 Finance Section Details
  finance_contact_person?: string | null;
  finance_email?: string | null;
  finance_phone?: string | null;
  finance_fax?: string | null;
  finance_alt_contact?: string | null;
  finance_alt_email?: string | null;

  payment_terms?: string | null;
  payment_method?: string | null;
  company_reg_no?: string | null;
  supplier_vat_no?: string | null;
  payable_bank?: string | null;

  gl_account_receivable?: string | null;
  gl_account_payable?: string | null;

  // Joined G/L account detail fields for UI display
  gl_account_receivable_code?: string | null;
  gl_account_receivable_name?: string | null;
  gl_account_payable_code?: string | null;
  gl_account_payable_name?: string | null;
  posting_group?: string;

  finance_charge?: string | null;
  has_finance_charge?: boolean;
  insurance_charge?: string | null;
  has_insurance_charge?: boolean;

  exclude_from_aging_report?: boolean;

  // 🟢 E-Document Generation Flags
  e_reminder?: boolean;
  e_statement?: boolean;
  e_invoice?: boolean;
  e_purchase_order?: boolean;
  e_debit_note?: boolean;
  e_remittance_advice?: boolean;

  // 🟢 Bank Account Details
  bank_account_name?: string | null;
  bank_sort_code?: string | null;
  bank_account_no?: string | null;
  bank_swift_bic?: string | null;
  bank_iban?: string | null;
  bank_name?: string | null;
  bank_address?: string | null;
};
