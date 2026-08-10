// lib/validations/debit-note.schema.ts

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

export const DebitNoteAddressSchema = z.object({
  id: looseUuid,
  debit_note_id: looseUuid,
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

export const DebitNoteLineSchema = z
  .object({
    id: looseUuid,
    debit_note_id: looseUuid,
    purchase_order_line_id: looseUuid,
    purchase_invoice_line_id: looseUuid,
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
    warehouse_location_id: z.string().uuid().optional().nullable(),
    uom_id: z.string().uuid().optional().nullable(),
    quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
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

export const DebitNoteSchema = z.object({
  id: looseUuid,
  company_id: looseUuid,
  debit_note_no: looseString,
  supplier_id: z.string().uuid("Supplier selection is required"),
  supplier_no: looseString,

  warehouse_id: looseUuid,
  purchaser: looseString,
  consignment_no: looseString,
  supp_order_no: looseString,
  link_to_so_no: looseString,
  anonymous_supplier: z.boolean().optional(),

  currency_id: looseUuid,
  exchange_rate: z.coerce.number().optional().default(1),

  order_date: looseString,
  req_receipt_date: looseString,
  receipt_date: looseString,
  expected_date: looseString,
  invoice_date: looseString,
  due_date: looseString,
  document_date: looseString,

  reference: looseString,

  payable_bank: looseString,
  payable_bank_id: looseUuid,

  payment_terms: looseString,
  payment_terms_id: looseUuid,

  payment_method: looseString,
  payment_method_id: looseUuid,

  previous_code: looseString,

  contact: looseString,
  book_in_phone: looseString,
  book_in_contact: looseString,
  book_in_email: looseString,

  shipment_method: looseString,
  shipment_method_id: looseUuid,

  shipping_agent: looseString,
  shipment_ref_no: looseString,
  warehouse_booking_ref_no: looseString,
  supplier_booking_ref_no: looseString,

  // shipment_po_not_req: z.boolean().optional(),

  reason: looseString,
  linked_po: looseString,

  freight_charges: z.coerce.number().optional(),
  shipment_date: looseString,
  delivery_date: looseString,
  delivery_time: looseString,

  notes: looseString,
  internal_notes: looseString,

  subtotal: z.coerce.number().optional(),
  tax_amount: z.coerce.number().optional(),
  total_amount: z.coerce.number().optional(),

  status: looseString,
});

export const DebitNotePayloadSchema = z.object({
  debitNote: DebitNoteSchema,
  lines: z
    .array(DebitNoteLineSchema)
    .min(
      1,
      "Transactional document records must contain at least 1 visual item line entry"
    ),
  primary_address: DebitNoteAddressSchema.nullable().optional(),
  billing_address: DebitNoteAddressSchema.nullable().optional(),
  shipping_address: DebitNoteAddressSchema.nullable().optional(),
});

export type DebitNoteInput = z.infer<typeof DebitNoteSchema>;
export type DebitNoteAddressInput = z.infer<typeof DebitNoteAddressSchema>;
export type DebitNoteLineInput = z.infer<typeof DebitNoteLineSchema>;
export type DebitNotePayloadInput = z.infer<typeof DebitNotePayloadSchema>;

/* import { z } from "zod";

const looseString = z.preprocess(
  (val) => (val === "" || val === null ? undefined : String(val)),
  z.string().optional(),
);

const looseNumber = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return 0;
  const parsed = Number(val);
  return isNaN(parsed) ? 0 : parsed;
}, z.number().nonnegative("Numeric values cannot be negative").default(0));

export const DebitNoteAddressSchema = z.object({
  id: z.string().uuid().optional(),
  debit_note_id: z.string().uuid().optional(),
  address_type: z.enum(["billing", "shipping"]),

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
  phone: looseString.superRefine((val, ctx) => {
    if (val && val.length > 50) {
      ctx.addIssue({
        code: "custom",
        message: "String must contain at most 50 character(s)",
      });
    }
  }),
  email: looseString.superRefine((val, ctx) => {
    if (val && !/^\S+@\S+\.\S+$/.test(val)) {
      ctx.addIssue({ code: "custom", message: "Invalid email structure" });
    }
  }),

  address_1: z.string().min(1, "Street address coordinates required").max(255),
  address_2: looseString,
  city: z.string().min(1, "Target destination city required").max(100),
  state: looseString,
  postcode: looseString,
  country: z.string().min(1, "Country designation code required").max(100),
});

export const DebitNoteLineSchema = z
  .object({
    id: z.string().uuid().optional(),
    debit_note_id: z.string().uuid().optional(),
    line_no: z.coerce.number().optional(),
    line_type: z.enum(["ITEM", "GL_ACCOUNT", "COMMENT"]),
    item_id: z.string().uuid().optional().nullable(),
    item_code: z.string().optional(),
    gl_account_id: z.string().uuid().optional().nullable(),
    account_code: z.string().optional(),
    description: z.string().max(500).optional(),
    warehouse_id: z.string().uuid().optional().nullable(),
    warehouse_location_id: z.string().uuid().optional().nullable(),
    uom_id: z.string().uuid().optional().nullable(),
    quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
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

export const DebitNoteSchema = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
  debit_note_no: z.string().optional(),
  supplier_id: z.string().uuid("Supplier selection is required"),
  warehouse_id: z.string().uuid().optional().nullable(),
  currency_id: z
    .string()
    .uuid("An operational currency selection token is required"),
  exchange_rate: z.coerce
    .number()
    .positive("Exchange rate factor must be greater than 0")
    .default(1),
  document_date: z
    .string()
    .min(1, "Document execution transaction date required"),
  reference: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  subtotal: looseNumber,
  tax_amount: looseNumber,
  total_amount: looseNumber,
  status: z.string().min(1, "Status stage is required"),
});

export const DebitNotePayloadSchema = z.object({
  debitNote: DebitNoteSchema, // 👈 Changed from 'note' to 'debitNote'
  lines: z
    .array(DebitNoteLineSchema)
    .min(
      1,
      "Transactional document records must contain at least 1 visual item line entry",
    ),
  billing_address: DebitNoteAddressSchema.nullable().optional(),
  shipping_address: DebitNoteAddressSchema.nullable().optional(),
});

export type DebitNoteInput = z.infer<typeof DebitNoteSchema>;
export type DebitNoteAddressInput = z.infer<typeof DebitNoteAddressSchema>;
export type DebitNoteLineInput = z.infer<typeof DebitNoteLineSchema>;
export type DebitNotePayloadInput = z.infer<typeof DebitNotePayloadSchema>;
 */