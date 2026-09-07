// lib/validations/currency.schema.ts

import { z } from "zod";

/**
 * ------------------------------------------------------------
 * UUID
 * ------------------------------------------------------------
 */

const uuidSchema = z.string().uuid("A valid UUID is required.");

/**
 * ------------------------------------------------------------
 * ISO DATE
 * ------------------------------------------------------------
 */

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

/**
 * ------------------------------------------------------------
 * EXCHANGE RATE
 *
 * PostgreSQL NUMERIC(18,6)
 *
 * Maximum:
 *   999999999999.999999
 *
 * Client-side JS numbers are not ideal for very large
 * financial values, so we additionally restrict the value
 * to a practical ERP range.
 * ------------------------------------------------------------
 */

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

/**
 * ------------------------------------------------------------
 * COMPANY CURRENCY
 *
 * Used when mapping currencies -> company.
 * Here currency_id means currencies.id.
 * ------------------------------------------------------------
 */

export const companyCurrencySchema = z.object({
  currency_id: uuidSchema,

  exchange_rate: exchangeRateSchema,

  is_base: z.boolean().default(false),
});

/**
 * ------------------------------------------------------------
 * CURRENCY RATE
 *
 * IMPORTANT:
 *
 * company_currency_id means:
 *     company_currencies.id
 *
 * It does NOT mean:
 *     currencies.id
 * ------------------------------------------------------------
 */

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

// import { z } from "zod";

// // Validates mapping a master global currency onto a tenant company
// export const companyCurrencySchema = z.object({
//   currency_id: z.string().uuid({ message: "Valid master currency reference ID required" }),
//   exchange_rate: z.number().positive({ message: "Exchange multiplier must be greater than 0" }),
//   is_base: z.boolean().default(false),
// });

// // Validates historical spot-rate overrides
// export const currencyRateSchema = z.object({
//   currency_id: z.string().uuid({ message: "Valid operational currency reference ID required" }),
//   exchange_rate: z.number().positive({ message: "Spot exchange rate entry must be greater than 0" }),
//   start_date: z.string(),
// });

// export type CompanyCurrencyInput = z.infer<typeof companyCurrencySchema>;

/* import { z } from "zod";

export const companyCurrencySchema = z.object({
  currency_id: z.string().uuid(),
  exchange_rate: z.number().positive(),
  is_base: z.boolean()
});
 */
