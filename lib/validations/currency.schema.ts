// lib/validations/currency.schema.ts

import { z } from "zod";

// Validates mapping a master global currency onto a tenant company
export const companyCurrencySchema = z.object({
  currency_id: z.string().uuid({ message: "Valid master currency reference ID required" }),
  exchange_rate: z.number().positive({ message: "Exchange multiplier must be greater than 0" }),
  is_base: z.boolean().default(false),
});

// Validates historical spot-rate overrides
export const currencyRateSchema = z.object({
  currency_id: z.string().uuid({ message: "Valid operational currency reference ID required" }),
  rate: z.number().positive({ message: "Spot exchange rate entry must be greater than 0" }),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { 
    message: "Effective date must match standard ISO YYYY-MM-DD format" 
  }),
});

/* import { z } from "zod";

export const companyCurrencySchema = z.object({
  currency_id: z.string().uuid(),
  exchange_rate: z.number().positive(),
  is_base: z.boolean()
});
 */

export type CompanyCurrencyInput = z.infer<typeof companyCurrencySchema>;