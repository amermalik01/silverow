// app/components/setup/opening-balances/customer/constants.ts

import type { Currency, CustomerOpeningBalanceRow } from "./types";

type CustomerParty = {
  id: string;
  code?: string;
  name: string;
  currency_id?: string;
};

export const createCustomerOpeningBalanceRow = (
  customer: CustomerParty,
  currencies: Currency[],
  baseCurrencyCode: string,
): CustomerOpeningBalanceRow => {
  const defaultCurrency = currencies.find(
    (currency) => currency.id === customer.currency_id,
  );

  return {
    posting_date: new Date().toISOString().split("T")[0],

    customer_id: customer.id,
    customer_code: customer.code,
    customer_name: customer.name,

    doc_type: "Invoice",
    doc_no: "",
    external_ref_no: "",
    description: "",

    currency_id: customer.currency_id || "",
    currency_code: defaultCurrency?.code || baseCurrencyCode,

    debit: 0,
    credit: 0,

    exchange_rate: defaultCurrency ? Number(defaultCurrency.exchange_rate) : 1,
  };
};
