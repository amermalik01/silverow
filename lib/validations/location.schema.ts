// lib/validations/location.schema.ts

import { z } from "zod";

export const locationSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),

  type: z.enum(["WAREHOUSE", "ZONE", "AISLE", "RACK", "SHELF", "BIN", "DEPOT"]),

  title: z.string().min(2, "Title is required"),
  code: z.string().optional(),

  is_primary: z.boolean().optional(),

  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),
  country_id: z.number().optional(),

  latitude: z.number().optional(),
  longitude: z.number().optional(),

  capacity: z.number().nullable().optional(),
  capacity_uom_id: z.number().nullable().optional(),

  status: z.number().optional(),
});

export type LocationInput = z.infer<typeof locationSchema>;
