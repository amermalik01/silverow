// lib/validations/purchase-order.schema.ts

import { z } from "zod";

/**
 * =========================================================
 * ADDRESS
 * =========================================================
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
 * =========================================================
 * LINE
 * =========================================================
 */

export const PurchaseOrderLineSchema = z.object({
  id: z.string().uuid().optional(),

  purchase_order_id: z.string().uuid().optional(),

  line_no: z.coerce.number().optional(),

  line_type: z.enum([
    "ITEM",
    "GL_ACCOUNT",
    "COMMENT",
  ]),

  /**
   * ITEM
   */
  item_id: z.string().uuid().optional(),

  item_code: z.string().optional(),

  /**
   * GL
   */
  gl_account_id: z.string().uuid().optional(),

  account_code: z.string().optional(),

  /**
   * COMMON
   */
  description: z.string().max(500).optional(),

  warehouse_id: z.string().uuid().optional(),

  warehouse_location_id: z.string().uuid().optional(),

  uom_id: z.string().uuid().optional(),

  quantity: z.coerce.number().min(0),

  received_quantity: z.coerce.number().min(0).optional(),

  unit_cost: z.coerce.number().min(0),

  /**
   * DISCOUNT
   */
  discount_type: z
    .enum(["PERCENT", "FIXED"])
    .optional(),

  discount_value: z.coerce.number().min(0).optional(),

  discount_amount: z.coerce.number().min(0).optional(),

  /**
   * VAT
   */
  vat_business_posting_group_id:
    z.string().uuid().optional(),

  vat_product_posting_group_id:
    z.string().uuid().optional(),

  vat_percent: z.coerce.number().min(0).optional(),

  vat_amount: z.coerce.number().min(0).optional(),

  /**
   * TOTALS
   */
  original_amount: z.coerce.number().min(0).optional(),

  net_amount: z.coerce.number().min(0).optional(),

  gross_amount: z.coerce.number().min(0).optional(),
})
.superRefine((line, ctx) => {
  /**
   * ITEM VALIDATION
   */
  if (line.line_type === "ITEM") {
    if (!line.item_id) {
      ctx.addIssue({
        code: "custom",
        message: "Item is required",
        path: ["item_id"],
      });
    }

    if (line.quantity <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Quantity required",
        path: ["quantity"],
      });
    }
  }

  /**
   * GL VALIDATION
   */
  if (line.line_type === "GL_ACCOUNT") {
    if (!line.gl_account_id) {
      ctx.addIssue({
        code: "custom",
        message: "GL Account required",
        path: ["gl_account_id"],
      });
    }
  }
});

/**
 * =========================================================
 * ORDER
 * =========================================================
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

  order_date: z.string().min(1),

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
 * =========================================================
 * PAYLOAD
 * =========================================================
 */

export const PurchaseOrderPayloadSchema = z.object({
  order: PurchaseOrderSchema,

  billing_address:
    PurchaseOrderAddressSchema.optional(),

  shipping_address:
    PurchaseOrderAddressSchema.optional(),

  lines: z
    .array(PurchaseOrderLineSchema)
    .min(1),
});

/**
 * =========================================================
 * TYPES
 * =========================================================
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


export type PurchaseOrderInput =
  z.infer<typeof PurchaseOrderSchema>;

export type PurchaseOrderAddressInput =
  z.infer<typeof PurchaseOrderAddressSchema>;

export type PurchaseOrderLineInput =
  z.infer<typeof PurchaseOrderLineSchema>;

export type PurchaseOrderPayloadInput =
  z.infer<typeof PurchaseOrderPayloadSchema>; */

