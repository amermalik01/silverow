// lib/validations/currency.schema.ts

import { z } from "zod";

export const companyCurrencySchema = z.object({
  currency_id: z.string().uuid(),
  exchange_rate: z.number().positive(),
  is_base: z.boolean()
});

export type CompanyCurrencyInput = z.infer<typeof companyCurrencySchema>;