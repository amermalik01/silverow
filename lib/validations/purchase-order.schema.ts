// lib/validations/purchase-order.schema.ts
import { z } from "zod";

const looseString = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined || val === "undefined") {
    return undefined;
  }
  return String(val);
}, z.string().optional());

const looseNumber = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return 0;
  const parsed = Number(val);
  return isNaN(parsed) ? 0 : parsed;
}, z.number().default(0));


const looseUuid = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) {
    return undefined;
  }

  return val;
}, z.string().uuid().optional());

export const PurchaseOrderAddressSchema = z.object({
  id: looseUuid,
  purchase_order_id: looseUuid,
  address_type: z.enum(["primary", "billing", "shipping"]),

  contact_name: looseString.superRefine((val, ctx) => {
    if (val && val.length > 150) {
      ctx.addIssue({
        code: "custom",
        message: "String must contain at most 150 character(s)",
      });
    }
  }),
  name: looseString.superRefine((val, ctx) => {
    if (val && val.length > 150) {
      ctx.addIssue({
        code: "custom",
        message: "String must contain at most 150 character(s)",
      });
    }
  }),
  attention: looseString,
  contact_person: looseString,
  phone: looseString.superRefine((val, ctx) => {
    if (val && val.length > 50) {
      ctx.addIssue({
        code: "custom",
        message: "String must contain at most 50 character(s)",
      });
    }
  }),
  email: looseString.superRefine((val, ctx) => {
    if (val && val !== "undefined" && !/^\S+@\S+\.\S+$/.test(val)) {
      ctx.addIssue({ code: "custom", message: "Invalid email structure" });
    }
  }),

  address_1: looseString,
  address_2: looseString,
  city: looseString,
  state: looseString,
  county: looseString,
  postcode: looseString,
  country: looseString,
});

export const PurchaseOrderLineSchema = z
  .object({
    id: looseUuid,
    purchase_order_id: looseUuid,
    line_no: z.coerce.number().optional(),
    line_type: z.enum(["ITEM", "GL_ACCOUNT", "COMMENT"]),
    item_id: z.string().uuid().optional().nullable(),
    item_code: z.string().optional().nullable(),
    item_name: z.string().optional().nullable(),
    gl_account_id: z.string().uuid().optional().nullable(),
    account_code: z.string().optional().nullable(),
    account_name: z.string().optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    warehouse_id: z.string().uuid().optional().nullable(),
    // warehouse_location_id: z.string().uuid().optional().nullable(),
    uom_id: z.string().uuid().optional().nullable(),
    quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
    received_quantity: z.coerce.number().min(0).optional().nullable(),
    unit_cost: looseNumber,
    discount_type: z.enum(["PERCENT", "FIXED"]).optional().nullable(),
    discount_value: looseNumber,
    discount_amount: looseNumber,
    vat_percent: looseNumber,
    vat_amount: looseNumber,
    net_amount: looseNumber,
    gross_amount: looseNumber,
  })
  .superRefine((line, ctx) => {
    if (line.line_type === "ITEM") {
      if (!line.item_id) {
        ctx.addIssue({
          code: "custom",
          message: "Item allocation is required",
          path: ["item_id"],
        });
      }
      if (!line.uom_id) {
        ctx.addIssue({
          code: "custom",
          message: "Unit of measure is required",
          path: ["uom_id"],
        });
      }
      if (line.quantity <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Quantity metric must be greater than 0",
          path: ["quantity"],
        });
      }
    }
    if (line.line_type === "GL_ACCOUNT" && !line.gl_account_id) {
      ctx.addIssue({
        code: "custom",
        message: "GL Account routing identification required",
        path: ["gl_account_id"],
      });
    }
  });

export const PurchaseOrderSchema = z.object({
  supplier_id: z.string().uuid(),

  supplier_no: looseString,

  purchaser: looseString,
  consignment_no: looseString,
  supp_order_no: looseString,
  link_to_so_no: looseString,

  currency_id: looseUuid,
  exchange_rate: z.coerce.number().optional(),

  order_date: z.string(),
  req_receipt_date: looseString,
  receipt_date: looseString,
  expected_date: looseString,
  invoice_date: looseString,
  due_date: looseString,

  reference: looseString,

  payable_bank: looseString,
  payable_bank_id: looseUuid,

  payment_terms: looseString,
  payment_terms_id: looseUuid,

  payment_method: looseString,
  payment_method_id: looseUuid,

  previous_code: looseString,
  link_to_cust: looseString,

  deduct_from_rebate: z.boolean().optional(),

  contact: looseString,
  book_in_phone: looseString,
  book_in_contact: looseString,
  book_in_email: looseString,

  shipment_method: looseString,
  shipment_method_id: looseUuid,

  shipping_agent: looseString,
  shipment_ref_no: looseString,
  warehouse_ref_no: looseString,

  // shipment_po_not_req: z.boolean().optional(),

  reason: looseString,
  linked_po: looseString,

  notes: looseString,
  internal_notes: looseString,

  subtotal: z.coerce.number().optional(),
  tax_amount: z.coerce.number().optional(),
  total_amount: z.coerce.number().optional(),

  status: looseString,
});

export const PurchaseOrderPayloadSchema = z.object({
  order: PurchaseOrderSchema,
  lines: z
    .array(PurchaseOrderLineSchema)
    .min(
      1,
      "Transactional document records must contain at least 1 visual item line entry",
    ),
  primary_address: PurchaseOrderAddressSchema.nullable().optional(),
  billing_address: PurchaseOrderAddressSchema.nullable().optional(),
  shipping_address: PurchaseOrderAddressSchema.nullable().optional(),
});

export type PurchaseOrderInput = z.infer<typeof PurchaseOrderSchema>;
export type PurchaseOrderAddressInput = z.infer<
  typeof PurchaseOrderAddressSchema
>;
export type PurchaseOrderLineInput = z.infer<typeof PurchaseOrderLineSchema>;
export type PurchaseOrderPayloadInput = z.infer<
  typeof PurchaseOrderPayloadSchema
>;
/* 

export const PurchaseOrderSchema = z.object({
  id: looseUuid,
  company_id: looseUuid,
  order_no: z.string().optional().nullable(),
  supplier_id: z.string().uuid("Supplier selection is required"),
  supplier_no: z.string().optional().nullable(),
  supplier_name: z.string().optional().nullable(),
  warehouse_id: z.string().uuid().optional().nullable(),
  currency_id: z
    .string()
    .uuid("An operational currency selection token is required"),
  exchange_rate: looseNumber.refine((val) => val > 0, {
    message: "Exchange rate factor must be greater than 0",
  }),
  order_date: z.string().min(1, "Order execution transaction date required"),
  expected_date: z.string().optional().nullable(),
  invoice_date: z.string().optional().nullable(),
  req_receipt_date: z.string().optional().nullable(),
  receipt_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  purchaser: looseString,
  consignment_no: looseString,
  supp_order_no: looseString,
  link_to_so_no: looseString,
  payable_bank: looseString,
  payable_bank_id: z.string().uuid().optional().nullable(),
  payment_terms: looseString,
  payment_terms_id: z.string().uuid().optional().nullable(),
  payment_method: looseString,
  payment_method_id: z.string().uuid().optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  subtotal: looseNumber,
  tax_amount: looseNumber,
  total_amount: looseNumber,
  status: z.string().min(1, "Status stage is required"),
});
*/
