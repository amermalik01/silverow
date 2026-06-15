// lib/validations/account.schema.ts

import { z } from "zod";

export const accountFormSchema = z
  .object({
    code: z.string().min(2, "G/L No. must be at least 2 characters").max(20),
    name: z.string().min(2, "Account name must be at least 2 characters").max(150),
    category_id: z.string().uuid().nullable().or(z.literal("")).transform(v => v === "" ? null : v),
    sub_category_id: z.string().uuid().nullable().or(z.literal("")).transform(v => v === "" ? null : v),
    heading_id: z.string().uuid().nullable().or(z.literal("")).transform(v => v === "" ? null : v),
    gl_account_type: z.enum(['Category', 'Sub-Category', 'Heading', 'Posting', 'End Total']),
    gl_no_display_as: z.string().max(50).nullable().or(z.literal("")).transform(v => v === "" ? null : v),
    vat_rate_id: z.string().uuid().nullable().or(z.literal("")).transform(v => v === "" ? null : v),
    status: z.string().default("Active"),
    range_start_code: z.string().max(20).nullable().or(z.literal("")).transform(v => v === "" ? null : v),
    range_end_code: z.string().max(20).nullable().or(z.literal("")).transform(v => v === "" ? null : v),
  })
  .refine(
    (data) => {
      if (data.gl_account_type === "End Total") {
        return !!data.range_start_code && !!data.range_end_code;
      }
      return true;
    },
    {
      message: "Range Start and End codes are required for End Total structural types",
      path: ["range_start_code"],
    }
  );

/* import { z } from "zod";

export const accountFormSchema = z
  .object({
    code: z
      .string()
      .min(2, "Code must be at least 2 characters")
      .max(20, "Code too long"),
    name: z.string().min(3, "Name must be at least 3 characters").max(100),
    account_type: z.enum([
      "ASSET",
      "LIABILITY",
      "EQUITY",
      "REVENUE",
      "EXPENSE",
    ]),
    parent_id: z
      .string()
      .uuid()
      .nullable()
      .or(z.literal(""))
      .transform((v) => (v === "" ? null : v)),
    vat_rate_id: z
      .string()
      .uuid()
      .nullable()
      .or(z.literal(""))
      .transform((v) => (v === "" ? null : v)),
    is_summary: z.boolean().default(false),
  })
  .refine((data) => !(data.is_summary && data.vat_rate_id), {
    message: "VAT rates cannot be assigned to summary node headers",
    path: ["vat_rate_id"],
  }); */
