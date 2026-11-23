
// types/prospect.ts


// types/prospect.ts

import type {
  ProspectActivityType,
  ProspectPriority,
  ProspectSource,
  ProspectStatus,
  ProspectPayload as ValidatedProspectPayload,
  ProspectActivityInput,
} from "@/lib/validations/prospect.schema";

/**
 * PostgreSQL NUMERIC values may be returned as strings by node-postgres.
 */
export type ProspectNumeric = number | string;

// -----------------------------------------------------------------------------
// Prospect contacts
// -----------------------------------------------------------------------------

export type ProspectContact = {
  id?: string;
  company_id?: string;
  prospect_id?: string;
  name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

// -----------------------------------------------------------------------------
// Prospect addresses
// -----------------------------------------------------------------------------

export type ProspectAddress = {
  id?: string;
  company_id?: string;
  prospect_id?: string;
  label: string;
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  is_billing: boolean;
  is_shipping: boolean;
  created_at?: string;
  updated_at?: string;
};

// -----------------------------------------------------------------------------
// Prospect
// -----------------------------------------------------------------------------

export type Prospect = {
  id: string;
  company_id: string;
  prospect_no: string;
  company_name: string;
  website: string | null;

  status: ProspectStatus;
  source: ProspectSource | null;
  priority: ProspectPriority;

  assigned_to: string | null;
  assigned_to_name: string | null;

  estimated_deal_value: ProspectNumeric;
  currency_id: string | null;
  currency_code?: string | null;

  /**
   * VAT business posting group used when resolving VAT
   * for prospect offer lines.
   */
  vat_business_group_id: string | null;

  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  reminder_enabled: boolean;

  converted_party_id: string | null;
  converted_at: string | null;
  converted_by: string | null;

  lost_reason: string | null;
  description: string | null;

  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

// -----------------------------------------------------------------------------
// Prospect notes
// -----------------------------------------------------------------------------

export type ProspectNote = {
  id: string;
  company_id: string;
  prospect_id: string;
  author_id: string | null;
  author: string;
  title: string;
  content: string;
  created_at: string;
};

// -----------------------------------------------------------------------------
// Prospect activities
// -----------------------------------------------------------------------------

export type ProspectActivity = {
  id: string;
  company_id: string;
  prospect_id: string;
  activity_type: ProspectActivityType;
  subject: string;
  description: string | null;
  activity_at: string;
  outcome: string | null;
  contact_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
};

// -----------------------------------------------------------------------------
// Prospect status history
// -----------------------------------------------------------------------------

export type ProspectStatusHistory = {
  id: string;
  company_id: string;
  prospect_id: string;
  previous_status: ProspectStatus | null;
  new_status: ProspectStatus;
  changed_by: string | null;
  changed_at: string;
  remarks: string | null;
};

// -----------------------------------------------------------------------------
// Prospect list
// -----------------------------------------------------------------------------

export type ProspectListRecord = {
  id: string;
  prospect_no: string;
  company_name: string;
  website: string | null;

  status: ProspectStatus;
  source: ProspectSource | null;
  priority: ProspectPriority;

  estimated_deal_value: ProspectNumeric;
  currency_id: string | null;
  currency_code: string | null;

  assigned_to: string | null;
  assigned_to_name: string | null;

  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  reminder_enabled: boolean;
  created_at: string;

  primary_contact_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  primary_city: string | null;

  activities_count: number;
};

// -----------------------------------------------------------------------------
// Prospect offer enums
// -----------------------------------------------------------------------------

export type ProspectOfferStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type ProspectOfferDiscountType =
  | "PERCENTAGE"
  | "AMOUNT";

// -----------------------------------------------------------------------------
// Prospect offer line
// -----------------------------------------------------------------------------

export interface ProspectOfferLine {
  id: string;
  offer_id: string;
  company_id: string;
  line_no: number;

  item_id: string | null;
  item_code: string | null;
  item_name: string;
  description: string | null;

  uom_id: string | null;
  uom_code: string | null;
  uom_name: string | null;

  quantity: ProspectNumeric;
  unit_price: ProspectNumeric;

  discount_type: ProspectOfferDiscountType;
  discount_value: ProspectNumeric;
  discount_amount: ProspectNumeric;

  vat_product_group_id: string | null;
  vat_posting_setup_id: string | null;
  sales_vat_account_id: string | null;

  vat_rate: ProspectNumeric;
  line_subtotal: ProspectNumeric;
  vat_amount: ProspectNumeric;
  line_total: ProspectNumeric;

  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Prospect offer
// -----------------------------------------------------------------------------

export interface ProspectOffer {
  id: string;
  company_id: string;
  prospect_id: string;
  offer_no: string;

  offer_date: string;
  valid_until: string | null;

  status: ProspectOfferStatus;

  currency_id: string;
  exchange_rate: ProspectNumeric;

  subtotal: ProspectNumeric;
  discount_total: ProspectNumeric;
  taxable_amount: ProspectNumeric;
  vat_total: ProspectNumeric;
  grand_total: ProspectNumeric;

  is_primary: boolean;
  notes: string | null;

  lines: ProspectOfferLine[];

  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Prospect offer input types
// -----------------------------------------------------------------------------
//
// These are input types, not database records.
//
// Item name/code, UOM snapshots, VAT posting setup, VAT account,
// discount amount, line totals and offer totals must be resolved or
// calculated by the server. Do not trust client-submitted totals.
//

export interface ProspectOfferLineInput {
  item_id: string;
  description?: string | null;

  quantity: ProspectNumeric;
  unit_price: ProspectNumeric;

  discount_type: ProspectOfferDiscountType;
  discount_value: ProspectNumeric;
}

export interface ProspectOfferPayload {
  offer_date: string;
  valid_until?: string | null;

  currency_id: string;
  exchange_rate: ProspectNumeric;

  is_primary?: boolean;
  notes?: string | null;

  lines: ProspectOfferLineInput[];
}

export interface ProspectOfferStatusPayload {
  status: ProspectOfferStatus;
}

// -----------------------------------------------------------------------------
// Prospect details
// -----------------------------------------------------------------------------

export type ProspectDetails = {
  prospect: Prospect;
  contacts: ProspectContact[];
  addresses: ProspectAddress[];
  activities: ProspectActivity[];
  notes: ProspectNote[];
  statusHistory: ProspectStatusHistory[];

  /**
   * Optional until the prospect details API loads offers.
   */
  offers?: ProspectOffer[];
};

// -----------------------------------------------------------------------------
// Prospect tabs
// -----------------------------------------------------------------------------

export type ProspectTab =
  | "general"
  | "contacts"
  | "addresses"
  | "activity"
  | "notes"
  | "offers"
  | "attachments";

// -----------------------------------------------------------------------------
// Existing prospect payloads
// -----------------------------------------------------------------------------

export type ProspectPayload = ValidatedProspectPayload;

export type ProspectActivityPayload = ProspectActivityInput;

export type ProspectStatusChangeOptions = {
  remarks?: string | null;
  lostReason?: string | null;
};

export type ProspectConversionPayload = {
  customerName?: string;
  customerStatus?: "active" | "inactive";
};


/* import type {
  ProspectActivityType,
  ProspectPriority,
  ProspectSource,
  ProspectStatus,
  ProspectPayload as ValidatedProspectPayload,
  ProspectActivityInput,
} from "@/lib/validations/prospect.schema";

export type ProspectContact = {
  id?: string;
  company_id?: string;
  prospect_id?: string;
  name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProspectAddress = {
  id?: string;
  company_id?: string;
  prospect_id?: string;
  label: string;
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  is_billing: boolean;
  is_shipping: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Prospect = {
  id: string;
  company_id: string;
  prospect_no: string;
  company_name: string;
  website: string | null;
  status: ProspectStatus;
  source: ProspectSource | null;
  priority: ProspectPriority;
  assigned_to: string | null;
  assigned_to_name: string | null;
  estimated_deal_value: number | string;
  currency_id: string | null;
  currency_code?: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  reminder_enabled: boolean;
  converted_party_id: string | null;
  converted_at: string | null;
  converted_by: string | null;
  lost_reason: string | null;
  description: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProspectNote = {
  id: string;
  company_id: string;
  prospect_id: string;
  author_id: string | null;
  author: string;
  title: string;
  content: string;
  created_at: string;
};

export type ProspectActivity = {
  id: string;
  company_id: string;
  prospect_id: string;
  activity_type: ProspectActivityType;
  subject: string;
  description: string | null;
  activity_at: string;
  outcome: string | null;
  contact_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
};

export type ProspectStatusHistory = {
  id: string;
  company_id: string;
  prospect_id: string;
  previous_status: ProspectStatus | null;
  new_status: ProspectStatus;
  changed_by: string | null;
  changed_at: string;
  remarks: string | null;
};

export type ProspectListRecord = {
  id: string;
  prospect_no: string;
  company_name: string;
  website: string | null;
  status: ProspectStatus;
  source: ProspectSource | null;
  priority: ProspectPriority;
  estimated_deal_value: number | string;
  currency_id: string | null;
  currency_code: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  reminder_enabled: boolean;
  created_at: string;

  primary_contact_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  primary_city: string | null;
  activities_count: number;
};

export type ProspectDetails = {
  prospect: Prospect;
  contacts: ProspectContact[];
  addresses: ProspectAddress[];
  activities: ProspectActivity[];
  notes: ProspectNote[];
  statusHistory: ProspectStatusHistory[];
};

export type ProspectTab =
  | "general"
  | "contacts"
  | "addresses"
  | "activity"
  | "notes"
  | "attachments";

export type ProspectPayload = ValidatedProspectPayload;

export type ProspectActivityPayload = ProspectActivityInput;

export type ProspectStatusChangeOptions = {
  remarks?: string | null;
  lostReason?: string | null;
};

export type ProspectConversionPayload = {
  customerName?: string;
  customerStatus?: "active" | "inactive";
};

export type ProspectOfferStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type ProspectOfferDiscountType =
  | "PERCENTAGE"
  | "AMOUNT";

export interface ProspectOfferLine {
  id: string;
  offer_id: string;
  company_id: string;
  line_no: number;

  item_id: string | null;
  item_code: string | null;
  item_name: string;
  description: string | null;

  uom_id: string | null;
  uom_code: string | null;
  uom_name: string | null;

  quantity: number;
  unit_price: number;

  discount_type: ProspectOfferDiscountType;
  discount_value: number;
  discount_amount: number;

  vat_product_group_id: string | null;
  vat_posting_setup_id: string | null;
  sales_vat_account_id: string | null;

  vat_rate: number;
  line_subtotal: number;
  vat_amount: number;
  line_total: number;

  created_at: string;
  updated_at: string;
}

export interface ProspectOffer {
  id: string;
  company_id: string;
  prospect_id: string;
  offer_no: string;

  offer_date: string;
  valid_until: string | null;

  status: ProspectOfferStatus;

  currency_id: string;
  exchange_rate: number;

  subtotal: number;
  discount_total: number;
  taxable_amount: number;
  vat_total: number;
  grand_total: number;

  is_primary: boolean;
  notes: string | null;

  lines: ProspectOfferLine[];

  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
} */
