// types/currency.ts

export type Currency = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
};

export type CompanyCurrency = {
  /**
   * company_currencies.id
   *
   * This is the ID used by the company currency/rate screens.
   */
  company_currency_id: string;

  /**
   * currencies.id
   *
   * This is the master currency ID.
   */
  currency_id: string;

  company_id: string;

  code: string;
  name: string;
  symbol: string | null;

  exchange_rate: number;
  is_base: boolean;
  status: number;

  effective_date?: string | null;
};

export type CurrencyRateHistoryItem = {
  id: string;
  effective_date: string;
  rate: number;
  inverted_exchange_rate: number;
  created_at: string;
};

export type CurrencyRateHistoryResponse = {
  rates: CurrencyRateHistoryItem[];
  avgPrevYears: number | null;
  avgCurrentYear: number | null;
};

export type CurrencyRateSaveRequest = {
  /**
   * company_currencies.id
   */
  company_currency_id?: string;

  /**
   * currencies.id
   *
   * Used when adding a brand-new company currency.
   */
  currency_id?: string;

  exchange_rate: number;
  start_date: string;
};

// export type Currency = {
//   id: string;
//   code: string;
//   name: string;
//   symbol: string;
// };

// export type CompanyCurrency = Currency & {
//   exchange_rate: number;
//   is_base: boolean;
// };
