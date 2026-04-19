// types/currency.ts

export type Currency = {
  id: string;
  code: string;
  name: string;
  symbol: string;
};

export type CompanyCurrency = Currency & {
  exchange_rate: number;
  is_base: boolean;
};