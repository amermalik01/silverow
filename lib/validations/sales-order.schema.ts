// lib/validations/sales-order.schema.ts

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

export const SalesOrderAddressSchema = z.object({
  id: looseUuid,
  sales_order_id: looseUuid,
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
  company_name: looseString,
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

export const SalesOrderLineSchema = z
  .object({
    id: looseUuid,
    sales_order_id: looseUuid,
    sales_quote_line_id: looseUuid,
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
    warehouse_code: z.string().optional().nullable(),
    warehouse_name: z.string().optional().nullable(),
    warehouse_location_id: z.string().uuid().optional().nullable(),
    uom_id: z.string().uuid().optional().nullable(),
    quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
    quantity_shipped: z.coerce.number().min(0).optional().nullable(),
    quantity_invoiced: z.coerce.number().min(0).optional().nullable(),
    unit_price: looseNumber,
    discount_type: z.enum(["PERCENT", "FIXED"]).optional().nullable(),
    discount_value: looseNumber,
    discount_amount: looseNumber,
    vat_percent: looseNumber,
    vat_amount: looseNumber,
    net_amount: looseNumber,
    gross_amount: looseNumber,
    line_amount: looseNumber,
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

export const SalesOrderSchema = z.object({
  id: looseUuid,
  company_id: looseUuid,
  order_no: looseString,
  customer_id: z.string().uuid("Customer selection is required"),
  customer_no: looseString,
  sales_quote_id: looseUuid,
  sales_quote_no: looseString,

  order_date: z.string().min(1, "Order date is required"),
  posting_date: looseString,
  dispatch_date: looseString,
  requested_delivery_date: looseString,
  delivery_date: looseString,
  due_date: looseString,

  reference: looseString,
  payable_bank: looseString,
  payable_bank_id: looseUuid,

  payment_terms: looseString,
  payment_terms_id: looseUuid,

  payment_method: looseString,
  payment_method_id: looseUuid,

  currency_id: looseUuid,
  currency_code: looseString,
  exchange_rate: z.coerce.number().optional().default(1),

  email: looseString,
  salesperson: looseString,
  cust_order_no: looseString,
  link_to_po: looseString,
  sq_no: looseString,

  anonymous_customer: z.boolean().optional(),
  contact: looseString,
  book_in_phone: looseString,
  book_in_contact: looseString,
  book_in_email: looseString,

  shipment_method: looseString,
  shipment_method_id: looseUuid,
  shipping_agent: looseString,
  shipment_ref_no: looseString,
  warehouse_ref_no: looseString,
  cust_warehouse_ref_no: looseString,
  reason: looseString,

  finance_charges: z.coerce.number().optional(),
  insurance_charges: z.coerce.number().optional(),
  freight_charges: z.coerce.number().optional(),

  converted_by: looseString,
  shipment_date: looseString,
  delivery_time: looseString,

  notes: looseString,
  internal_notes: looseString,

  subtotal: z.coerce.number().optional(),
  tax_amount: z.coerce.number().optional(),
  total_amount: z.coerce.number().optional(),

  status: looseString,
  shipment_status: looseString,
  invoice_status: looseString,
  source_of_order: looseString,
});

export const SalesOrderPayloadSchema = z.object({
  order: SalesOrderSchema,
  lines: z
    .array(SalesOrderLineSchema)
    .min(
      1,
      "Transactional document records must contain at least 1 visual item line entry",
    ),
  primary_address: SalesOrderAddressSchema.nullable().optional(),
  billing_address: SalesOrderAddressSchema.nullable().optional(),
  shipping_address: SalesOrderAddressSchema.nullable().optional(),
});

export type SalesOrderInput = z.infer<typeof SalesOrderSchema>;
export type SalesOrderAddressInput = z.infer<typeof SalesOrderAddressSchema>;
export type SalesOrderLineInput = z.infer<typeof SalesOrderLineSchema>;
export type SalesOrderPayloadInput = z.infer<typeof SalesOrderPayloadSchema>;
