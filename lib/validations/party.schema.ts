// lib/validations/party.schema.ts

import { z } from "zod";

// Preprocessor to safely convert empty strings or null values to undefined
const looseString = z.preprocess(
  (val) => (val === "" || val === null ? undefined : String(val)),
  z.string().optional()
);

// Preprocessor specifically tailored for email formatting rules
const looseEmail = z.preprocess(
  (val) => (val === "" || val === null ? undefined : String(val)),
  z.string().email("Invalid email format").optional()
);

// Preprocessor to cast string inputs from form fields into numbers safely
const looseNumber = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return 0;
  const parsed = Number(val);
  return isNaN(parsed) ? 0 : parsed;
}, z.number().nonnegative("Credit ceiling bounds cannot be negative").default(0));



export const PartyContactSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  job_title: looseString,
  email: looseEmail,
  phone: looseString,
  mobile: looseString,
  notes: looseString,
  is_primary: z.boolean().default(false),
});

export const PartyAddressSchema = z.object({
  label: z.string().min(1, "Address label required (e.g. Head Office)"),
  address_1: z.string().min(1, "Street address location details are required"),
  address_2: looseString,
  city: z.string().min(1, "Target city is required"),
  state: looseString,
  postcode: z.string().min(1, "Postal code required"),
  country: z.string().min(1, "Country designation code required"),
  phone: looseString,
  email: looseEmail,
  is_primary: z.boolean().default(false),
  is_billing: z.boolean().default(false),
  is_shipping: z.boolean().default(false),
});

export const PartySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Legal company identifier name is required"),
  status: z.enum(["active", "inactive", "blocked"]).default("active"),
  is_crm_lead: z.boolean().default(false),
  is_srm_vendor: z.boolean().default(false),
  is_customer: z.boolean().default(false),
  is_supplier: z.boolean().default(false),

  email: looseEmail,
  phone: looseString,
  mobile: looseString,
  website: z.preprocess(
    (val) => (val === "" || val === null ? undefined : String(val)),
    z.string().url("Invalid website URL path structure").optional()
  ),

  credit_limit: looseNumber, // Resolves the "expected number, received string" error
  currency_id: looseString,
  salesperson_id: looseString,
  bucket_id: looseString,
});

// Helper preprocessor to cleanly treat empty strings as undefined for optional validation routes
/* const emptyToUndefined = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().optional(),
);
export const PartyContactSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  job_title: looseString,
  email: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().email("Invalid email format").optional(),
  ),
  phone: emptyToUndefined,
  mobile: emptyToUndefined,
  notes: emptyToUndefined,
  is_primary: z.boolean().default(false),
});

export const PartyAddressSchema = z.object({
  label: z.string().min(1, "Address label required (e.g. Head Office)"),
  address_1: z.string().min(1, "Street address location details are required"),
  address_2: emptyToUndefined,
  city: z.string().min(1, "Target city is required"),
  state: emptyToUndefined, // Aligned with backend API column schema naming
  postcode: z.string().min(1, "Postal code required"),
  country: z.string().min(1, "Country designation code required"), // Aligned with API
  phone: emptyToUndefined,
  email: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().email("Invalid email format").optional(),
  ),
  is_primary: z.boolean().default(false),
  is_billing: z.boolean().default(false),
  is_shipping: z.boolean().default(false),
});

export const PartySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Legal company identifier name is required"),
  status: z.enum(["active", "inactive", "blocked"]).default("active"),
  is_crm_lead: z.boolean().default(false),
  is_srm_vendor: z.boolean().default(false),
  is_customer: z.boolean().default(false),
  is_supplier: z.boolean().default(false),

  email: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().email("Invalid email format").optional(),
  ),
  phone: emptyToUndefined,
  mobile: emptyToUndefined,
  website: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().url("Invalid website URL path structure").optional(),
  ),

  credit_limit: z
    .number()
    .nonnegative("Credit ceiling bounds cannot be negative")
    .default(0),
  currency_id: emptyToUndefined,
  salesperson_id: emptyToUndefined,
  bucket_id: emptyToUndefined,
});
 */


/* import { z } from "zod";

export const PartyContactSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  job_title: z.string().optional(),
  email: z.string().email("Invalid email format").or(z.literal("")).optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  is_primary: z.boolean().default(false),
});

export const PartyAddressSchema = z.object({
  label: z.string().min(1, "Address label required (e.g. Head Office)"),
  address_1: z.string().min(1, "Street address location details are required"),
  address_2: z.string().optional(),
  city: z.string().min(1, "Target city is required"),
  county: z.string().optional(),
  postcode: z.string().min(1, "Postal code required"),
  country_id: z.string().min(1, "Country designation code required"),
  is_primary: z.boolean().default(false),
  is_billing: z.boolean().default(false),
  is_shipping: z.boolean().default(false),
});

export const PartySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Legal company identifier name is required"),
  status: z.enum(["active", "inactive", "blocked"]).default("active"),
  
  // High-fidelity role architecture configuration
  is_crm_lead: z.boolean().default(false),
  is_srm_vendor: z.boolean().default(false),
  is_customer: z.boolean().default(false),
  is_supplier: z.boolean().default(false),

  email: z.string().email("Invalid email format").or(z.literal("")).optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  website: z.string().url("Invalid website URL path structure").or(z.literal("")).optional(),

  credit_limit: z.number().nonnegative("Credit ceiling bounds cannot be negative").default(0),
  currency_id: z.string().optional(),
  salesperson_id: z.string().optional(),
  bucket_id: z.string().optional(),
});
 */
