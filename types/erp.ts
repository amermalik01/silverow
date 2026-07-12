// types/erp.ts

import { z } from "zod";
import { PartySchema } from "@/lib/validations/party.schema";

export type Party = z.infer<typeof PartySchema>;
export type PartyType = "customer" | "supplier" | "lead" | "vendor" | "both";
export type PartyModule = "crm" | "srm" | "hr" | "procurement";

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
};
