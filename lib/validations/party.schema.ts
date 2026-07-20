// lib/validations/party.schema.ts

import { z } from "zod";

// Preprocessor to safely convert empty strings or null values to undefined
const looseString = z.preprocess(
  (val) => (val === "" || val === null ? undefined : String(val)),
  z.string().optional(),
);

// Preprocessor specifically tailored for email formatting rules
const looseEmail = z.preprocess(
  (val) => (val === "" || val === null ? undefined : String(val)),
  z.string().email("Invalid email format").optional(),
);

// Preprocessor to cast string inputs from form fields into numbers safely
const looseNumber = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return 0;
  const parsed = Number(val);
  return isNaN(parsed) ? 0 : parsed;
}, z.number().nonnegative("Credit ceiling bounds cannot be negative").default(0));

const looseDate = z.preprocess(
  (val) => (val === "" || val === null ? undefined : String(val)),
  z.string().optional()
);

export const PartyContactSchema = z.object({
  id: looseString,
  party_id: looseString,
  name: z.string().min(1, "Contact name is required"),
  job_title: looseString,
  email: looseEmail,
  phone: looseString,
  mobile: looseString,
  notes: looseString,
  is_primary: z.boolean().default(false),
});

export const PartyAddressSchema = z.object({
  id: looseString,
  party_id: looseString,
  label: z
    .string()
    .min(1, "Address label required (e.g. Head Office)")
    .default("Primary Location"),
  address_1: z.string().min(1, "Street address location details are required"),
  address_2: looseString,
  city: z.string().min(1, "Target city is required"),
  state: looseString,
  postcode: z.string().min(1, "Postal code required"),
  country: z
    .string()
    .min(1, "Country designation code required")
    .default("United Kingdom"),
  phone: looseString,
  email: looseEmail,
  is_primary: z.boolean().default(false),
  is_billing: z.boolean().default(false),
  is_shipping: z.boolean().default(false),
  is_collection: z.boolean().default(false),
});

export const PartySchema = z.object({
  id: looseString,
  company_id: looseString,
  name: z.string().min(1, "Legal company identifier name is required"),

  status: z
    .enum(["active", "inactive", "prospect", "suspended"])
    .default("active"),

  is_crm_lead: z.boolean().default(false),
  is_srm_vendor: z.boolean().default(false),
  is_customer: z.boolean().default(false),
  is_supplier: z.boolean().default(false),

  crm_code: looseString,
  srm_code: looseString,
  customer_code: looseString,
  supplier_code: looseString,

  email: looseEmail,
  phone: looseString,
  mobile: looseString,
  website: z.preprocess(
    (val) => (val === "" || val === null ? undefined : String(val)),
    z.string().url("Invalid website URL path structure").optional(),
  ),
  country: z.string().nullable().optional(),
  // country: z.string().min(1, "Country designation code required").default("United Kingdom"),

  credit_limit: looseNumber,
  // currency_id: looseString,
  currency_id: z.string().min(1, "Currency selection is required"),
  salesperson_id: looseString,
  bucket_id: looseString,

  // Add these rules inside your export const PartySchema = z.object({ ... }) matrix:
  vat_reg_no: looseString,
  // segment_id: looseString,
  segment_id: z.string().min(1, "Segment is required"),
  territory_id: looseString,
  buying_group_id: looseString,
  credit_rating_id: looseString,
  ownership_type_id: looseString,
  classification_id: looseString,
  territories_id: looseString,
  type_id: looseString,
  status_id: looseString,
  source_of_crm_id: looseString,

  no_of_emp: looseNumber,
  turnover: looseNumber,
  comp_reg_no: looseString,
  date_of_inc: looseDate,
  additional_information: looseString,

  assign_person_id: looseString,
  assign_person: looseString,

  sales_posting_group_id: looseString,
  purchase_posting_group_id: looseString,
});
