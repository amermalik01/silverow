// lib/validations/purchase-order.schema.ts

import { z } from "zod";

/**
 * ADDRESS
 */

export const PurchaseOrderAddressSchema = z.object({
  id: z.string().uuid().optional(),

  purchase_order_id: z.string().uuid().optional(),

  address_type: z.enum(["billing", "shipping"]),

  contact_name: z.string().max(150).optional(),

  company_name: z.string().max(150).optional(),

  phone: z.string().max(50).optional(),

  email: z.string().email().optional().or(z.literal("")),

  address_1: z.string().max(255).optional(),

  address_2: z.string().max(255).optional(),

  city: z.string().max(100).optional(),

  state: z.string().max(100).optional(),

  postcode: z.string().max(30).optional(),

  country: z.string().max(100).optional(),
});

/**
 * LINES
 */

export const PurchaseOrderLineSchema = z.object({
  id: z.string().uuid().optional(),

  purchase_order_id: z.string().uuid().optional(),

  item_id: z.string().uuid({
    message: "Item is required",
  }),

  warehouse_id: z.string().uuid().optional(),

  uom_id: z.string().uuid().optional(),

  description: z.string().max(500).optional(),

  quantity: z.coerce.number().positive({
    message: "Quantity must be greater than 0",
  }),

  received_quantity: z.coerce.number().min(0).optional(),

  unit_cost: z.coerce.number().min(0),

  tax_percent: z.coerce.number().min(0).optional(),

  tax_amount: z.coerce.number().min(0).optional(),

  line_total: z.coerce.number().min(0).optional(),
});

/**
 * ORDER
 */

export const PurchaseOrderSchema = z.object({
  id: z.string().uuid().optional(),

  company_id: z.string().uuid().optional(),

  order_no: z.string().optional(),

  supplier_id: z.string().uuid({
    message: "Supplier is required",
  }),

  warehouse_id: z.string().uuid().optional(),

  currency_id: z.string().uuid().optional(),

  order_date: z.string().min(1, {
    message: "Order date is required",
  }),

  expected_date: z.string().optional(),

  reference: z.string().max(100).optional(),

  notes: z.string().max(5000).optional(),

  subtotal: z.coerce.number().min(0).optional(),

  tax_amount: z.coerce.number().min(0).optional(),

  total_amount: z.coerce.number().min(0).optional(),

  status: z
    .enum([
      "draft",
      "open",
      "partial_received",
      "received",
      "cancelled",
      "posted",
    ])
    .optional(),
});

/**
 * PAYLOAD
 */

export const PurchaseOrderPayloadSchema = z.object({
  order: PurchaseOrderSchema,

  billing_address:
    PurchaseOrderAddressSchema.optional(),

  shipping_address:
    PurchaseOrderAddressSchema.optional(),

  lines: z
    .array(PurchaseOrderLineSchema)
    .min(1, {
      message: "At least one line is required",
    }),
});

/**
 * TYPES
 */

export type PurchaseOrderInput =
  z.infer<typeof PurchaseOrderSchema>;

export type PurchaseOrderAddressInput =
  z.infer<typeof PurchaseOrderAddressSchema>;

export type PurchaseOrderLineInput =
  z.infer<typeof PurchaseOrderLineSchema>;

export type PurchaseOrderPayloadInput =
  z.infer<typeof PurchaseOrderPayloadSchema>;

/* import { z } from "zod";

export const PurchaseOrderLineSchema = z.object({
  id: z.string().uuid().optional(),

  item_id: z.string().uuid({
    message: "Item is required",
  }),

  warehouse_id: z.string().uuid().optional(),

  uom_id: z.string().uuid().optional(),

  description: z.string().optional(),

  quantity: z.coerce.number().positive(),

  received_quantity: z.coerce.number().min(0).optional(),

  unit_cost: z.coerce.number().min(0),

  tax_percent: z.coerce.number().min(0).optional(),

  tax_amount: z.coerce.number().min(0).optional(),

  line_total: z.coerce.number().min(0).optional(),
});

export const PurchaseOrderSchema = z.object({
  id: z.string().uuid().optional(),

  supplier_id: z.string().uuid({
    message: "Supplier is required",
  }),

  warehouse_id: z.string().uuid().optional(),

  currency_id: z.string().uuid().optional(),

  order_date: z.string().min(1),

  expected_date: z.string().optional(),

  reference: z.string().optional(),

  notes: z.string().optional(),

  subtotal: z.coerce.number().optional(),

  tax_amount: z.coerce.number().optional(),

  total_amount: z.coerce.number().optional(),

  status: z
    .enum([
      "draft",
      "open",
      "partial_received",
      "received",
      "cancelled",
      "posted",
    ])
    .optional(),
});

export const PurchaseOrderPayloadSchema = z.object({
  order: PurchaseOrderSchema,

  lines: z
    .array(PurchaseOrderLineSchema)
    .min(1, "At least one line is required"),
});

export type PurchaseOrderInput = z.infer<typeof PurchaseOrderSchema>;

export type PurchaseOrderLineInput = z.infer<typeof PurchaseOrderLineSchema>;

export type PurchaseOrderPayloadInput = z.infer<
  typeof PurchaseOrderPayloadSchema
>;
 */