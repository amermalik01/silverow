// lib/validations/debit-note.schema.ts

import { z } from "zod";

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

// export const DebitNotePayloadSchema = z.object({
//   note: DebitNoteSchema,
//   lines: z
//     .array(DebitNoteLineSchema)
//     .min(
//       1,
//       "Transactional document records must contain at least 1 visual item line entry",
//     ),
//   billing_address: DebitNoteAddressSchema.nullable().optional(),
//   shipping_address: DebitNoteAddressSchema.nullable().optional(),
// });

export type DebitNoteInput = z.infer<typeof DebitNoteSchema>;
export type DebitNoteAddressInput = z.infer<typeof DebitNoteAddressSchema>;
export type DebitNoteLineInput = z.infer<typeof DebitNoteLineSchema>;
export type DebitNotePayloadInput = z.infer<typeof DebitNotePayloadSchema>;
