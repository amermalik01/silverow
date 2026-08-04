// lib/validations/item.schema.ts

import { z } from "zod";

export const ItemSchema = z.object({
  item_code: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  brand_id: z.string().optional().nullable(),
  base_uom_id: z.string().min(1, "Base UOM is required"),
  purchase_uom_id: z.string().optional().nullable(),
  sales_uom_id: z.string().optional().nullable(),
  item_type: z.number().default(1),
  status: z.number().default(1),
  stock_tracking: z.boolean().default(true),
  reorder_qty: z.union([z.string(), z.number()]).optional().nullable(),
  standard_sales_price: z.union([z.string(), z.number()]).optional().nullable(),
  standard_cost: z.union([z.string(), z.number()]).optional().nullable(),
  costing_method: z.number().default(1),

  // VAT Product Posting Group
  vat_product_group_id: z.string().optional().nullable(),

  // GL Accounting & Posting Group Fields
  inventory_posting_group_id: z.string().optional().nullable(),
  inventory_gl_id: z.string().optional().nullable(),
  cogs_gl_id: z.string().optional().nullable(),
  sales_gl_id: z.string().optional().nullable(),
  purchase_gl_id: z.string().optional().nullable(),
});

export const ItemWarehouseSchema = z.object({
  warehouse_id: z.string().min(1, "Warehouse ID is required"),
  storage_location_id: z.string().optional().nullable(),
  unit_of_measure: z.string().optional().nullable(),
  cost_frequency: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  cost: z.union([z.string(), z.number()]).optional().nullable(),
  is_default: z.boolean().default(false),
  status: z.number().default(1),
  start_date: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
});