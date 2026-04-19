// lib/validations/warehouse.schema.ts

import { z } from "zod";

export const warehouseSchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["DISTRIBUTION", "STORE", "TRANSIT", "COLD_STORAGE"]),
  status: z.number().optional(),

  primary_location_id: z.string().uuid().nullable().optional(),
  currency_id: z.string().uuid().nullable().optional(),
  storage_type_id: z.string().uuid().nullable().optional(),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;
