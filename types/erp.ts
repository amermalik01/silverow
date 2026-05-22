// types/erp.ts

import { z } from "zod";
import { PartySchema } from "@/lib/validations/party.schema";

/* =========================
   SINGLE SOURCE OF TRUTH
========================= */
export type Party = z.infer<typeof PartySchema>;

/* =========================
   ENUM TYPES
========================= */

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
}

export type PartyContactDraft = {
  id?: string;
  party_id?: string;

  name: string;
  job_title?: string;
  email?: string;
  phone?: string;
  mobile?: string;

  is_primary: boolean;
};

export interface PartyAddress {
  id: string;
  party_id: string;
  address_1?: string;
  city?: string;
  country?: string;
  is_primary?: boolean;
}

export type PartyAddressDraft = {
  id?: string;
  party_id?: string;

  address_1: string;
  address_2?: string;

  city?: string;
  county?: string;
  postcode?: string;
  country_id?: string;

  phone?: string;
  email?: string;

  is_primary: boolean;
  is_billing?: boolean;
  is_shipping?: boolean;
};

export type PartyDraft = {
  id?: string;
  name: string;
  type: PartyType;
  status: string;
  email?: string;
  phone?: string;
  website?: string;
  credit_limit?: number;
  currency_id?: string;
  salesperson_id?: string;
};

/* export interface Party {
  id: string;
  company_id: string;

  name: string;

  type: PartyType;

  crm_code?: string;
  srm_code?: string;
  customer_code?: string;
  supplier_code?: string;

  email?: string;
  phone?: string;
  mobile?: string;

  website?: string;

  status: "active" | "inactive";

  credit_limit?: number;
  currency_id?: string;

  salesperson_id?: string;
  bucket_id?: string;

  created_at: string;
} */