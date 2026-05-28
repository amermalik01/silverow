// lib/validations/account.schema.ts

import { z } from "zod";

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
  });
