// lib/validations/party.schema.ts

import { z } from "zod";

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

/* import { z } from "zod";

export const PartySchema = z.object({
  id: z.string().optional(),

  name: z.string().min(1),

  type: z.enum(["customer", "supplier", "lead", "vendor", "both"]),

  status: z.enum(["active", "inactive", "blocked"]).default("active"),

  email: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  website: z.string().optional(),

  crm_code: z.string().optional(),
  srm_code: z.string().optional(),
  customer_code: z.string().optional(),
  supplier_code: z.string().optional(),

  credit_limit: z.number().optional(),
  currency_id: z.string().optional(),
  salesperson_id: z.string().optional(),
  bucket_id: z.string().optional(),

  
  address_1: z.string().optional(),
  country_id: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),

  is_billing: z.boolean().optional(),
  is_shipping: z.boolean().optional(),

  created_at: z.string().optional(),
}); */