// lib/validations/currency.schema.ts

import { z } from "zod";
const uuidSchema = z.string().uuid("A valid UUID is required.");

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date must be in YYYY-MM-DD format.")
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00.000Z`);

      if (Number.isNaN(date.getTime())) {
        return false;
      }

      return date.toISOString().slice(0, 10) === value;
    },
    {
      message: "Effective date is invalid.",
    },
  );

const exchangeRateSchema = z
  .number({
    message: "Exchange rate is required.",
  })
  .finite({
    message: "Exchange rate must be a valid number.",
  })
  .positive({
    message: "Exchange rate must be greater than 0.",
  })
  .max(999999999999.999999, "Exchange rate is too large.")
  .refine(
    (value) => {
      const decimalPart = value.toString().split(".")[1];

      return !decimalPart || decimalPart.length <= 6;
    },
    {
      message: "Exchange rate supports a maximum of 6 decimal places.",
    },
  );

export const companyCurrencySchema = z.object({
  currency_id: uuidSchema,
  exchange_rate: exchangeRateSchema,
  is_base: z.boolean().default(false),
});

export const currencyRateSchema = z
  .object({
    company_currency_id: z.string().uuid().optional(),
    currency_id: z.string().uuid().optional(),
    exchange_rate: exchangeRateSchema,
    start_date: isoDateSchema,
  })
  .refine((value) => Boolean(value.company_currency_id || value.currency_id), {
    message: "Either company_currency_id or currency_id is required.",
    path: ["currency_id"],
  });

export type CompanyCurrencyInput = z.infer<typeof companyCurrencySchema>;
export type CurrencyRateInput = z.infer<typeof currencyRateSchema>;
