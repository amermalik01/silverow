// types/crm.ts

export type CRMAccount = {
  id?: string;

  company_id?: string;

  crm_code?: string;
  customer_code?: string;

  name: string;

  email?: string;
  phone?: string;
  website?: string;

  credit_limit?: number;
  currency_id?: string;
  salesperson_id?: string;

  status?: "active" | "inactive" | "blocked";

  // primary contact (from general tab)
  contact_person?: string;
  cemail?: string;
  cphone?: string;

  // primary address
  address_1?: string;
  address_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country_id?: string;

  is_billing?: boolean;
  is_shipping?: boolean;
};

export type CRMContact = {
  id?: string;
  account_id?: string;

  name: string;
  email?: string;
  phone?: string;

  is_primary?: boolean;
};

export type CRMAddress = {
  id?: string;
  account_id?: string;

  address_1: string;
  address_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country_id?: string;

  is_primary?: boolean;
};