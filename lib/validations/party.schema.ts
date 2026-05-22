// lib/validations/party.schema.ts

import { z } from "zod";

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
});

/* export const PartySchema = z.object({
  id: z.string().optional(),

  name: z.string().min(1, "Name is required"),

  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  website: z.string().optional(),

  crm_code: z.string().optional(),
  srm_code: z.string().optional(),
  customer_code: z.string().optional(),

  currency_id: z.string().optional(),
  salesperson_id: z.string().optional(),

  status: z.enum(["active", "inactive", "blocked"]).default("active"),

  credit_limit: z.number().optional(),

  address_1: z.string().optional(),
  country_id: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),

  is_billing: z.boolean().optional(),
  is_shipping: z.boolean().optional(),
}); */