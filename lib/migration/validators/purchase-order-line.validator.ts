// lib/migration/validators/purchase-order-line.validator.ts

import { z } from "zod";

export const PurchaseOrderMigrationSchema = z.object({
  item_code: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit_cost: z.coerce.number().nonnegative(),
  warehouse_code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  discount_type: z.enum(["PERCENT", "FIXED"]).optional(),
  discount_value: z.coerce.number().optional(),
  vat_percent: z.coerce.number().optional(),
});
