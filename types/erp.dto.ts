// types/erp.dto.ts
import { PartyType } from "./erp";

/* =========================
   PARTY UPDATE DTO
========================= */

export interface PartyUpdateDTO {
  name: string;

  email?: string;
  phone?: string;
  mobile?: string;

  website?: string;

  credit_limit?: number;
  currency_id?: string;

  salesperson_id?: string;

  status?: "active" | "inactive";

  type?: PartyType;
}

/* =========================
   CONTACT DTO
========================= */

export interface PartyContactDTO {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  is_primary?: boolean;
}

/* =========================
   ADDRESS DTO
========================= */

export interface PartyAddressDTO {
  id?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  country?: string;
  postcode?: string;
  is_primary?: boolean;
}