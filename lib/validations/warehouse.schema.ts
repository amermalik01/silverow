// lib/validations/warehouse.schema.ts

import { z } from "zod";

export const warehouseSchema = z.object({
  name: z.string().min(2, "Name is required"),
  
  // Accepts dynamic storage type string or preset enums
  type: z.string().min(1, "Warehouse type is required"),
  
  status: z.number().optional().default(1),
  is_default: z.boolean().optional().default(false),

  // Address Details
  address_line_1: z.string().nullable().optional(),
  address_line_2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  county: z.string().nullable().optional(),
  postcode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),

  // Primary Contact Details
  contact_person: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
  telephone: z.string().nullable().optional(),
  direct_line: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  email: z.string().email("Invalid email format").or(z.literal("")).nullable().optional(),
  fax: z.string().nullable().optional(),
  e_dispatch_email: z.boolean().optional().default(false),

  // Storage & Costing
  warehouse_storage_type: z.string().nullable().optional(),
  primary_location_id: z.string().uuid().nullable().optional().or(z.literal("")),
  parent_location_id: z.string().uuid().nullable().optional().or(z.literal("")),
  start_date: z.string().nullable().optional(),
  unit_of_measure: z.string().nullable().optional(),
  cost_frequency: z.string().nullable().optional(),
  currency_id: z.string().uuid().nullable().optional().or(z.literal("")),
  cost: z.union([z.number(), z.string()]).nullable().optional(),
  comments: z.string().nullable().optional(),

  storage_type_id: z.string().uuid().nullable().optional().or(z.literal("")),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;

/* import { z } from "zod";

export const warehouseSchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["DISTRIBUTION", "STORE", "TRANSIT", "COLD_STORAGE"]),
  status: z.number().optional(),

  primary_location_id: z.string().uuid().nullable().optional(),
  currency_id: z.string().uuid().nullable().optional(),
  storage_type_id: z.string().uuid().nullable().optional(),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>; */
