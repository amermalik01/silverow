// constants.ts

import type { BankOpeningBalanceRow, Currency } from "./types";

export type BankOpeningBalanceParty = {
  id: string;
  code?: string;
  name: string;
  currency_id?: string;
};

export const createBankOpeningBalanceRow = (
  party: BankOpeningBalanceParty,
  partyType: "customer" | "supplier",
  currencies: Currency[],
  baseCurrencyCode: string,
): BankOpeningBalanceRow => {
  const defaultCurrency = currencies.find(
    (currency) => currency.id === party.currency_id,
  );

  return {
    posting_date: new Date().toISOString().split("T")[0],

    party_type: partyType,
    party_id: party.id,
    party_code: party.code,
    party_name: party.name,

    doc_type: "Payment",
    doc_no: "",
    external_ref_no: "",

    bank_gl_account_id: "",
    bank_gl_code: "",
    bank_gl_name: "",

    currency_id: party.currency_id || "",
    currency_code: defaultCurrency?.code || baseCurrencyCode,

    debit: 0,
    credit: 0,

    exchange_rate: defaultCurrency ? Number(defaultCurrency.exchange_rate) : 1,
  };
};
