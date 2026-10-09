// app/components/setup/opening-balances/supplier/constants.ts

import type { Currency, SupplierOpeningBalanceRow } from "./types";

type SupplierParty = {
  id: string;
  code?: string;
  name: string;
  currency_id?: string;
};

export const createSupplierOpeningBalanceRow = (
  supplier: SupplierParty,
  currencies: Currency[],
  baseCurrencyCode: string,
): SupplierOpeningBalanceRow => {
  const defaultCurrency = currencies.find(
    (currency) => currency.id === supplier.currency_id,
  );

  return {
    posting_date: new Date().toISOString().split("T")[0],

    supplier_id: supplier.id,
    supplier_code: supplier.code,
    supplier_name: supplier.name,

    doc_type: "Invoice",
    doc_no: "",
    external_ref_no: "",
    description: "",

    currency_id: supplier.currency_id || "",

    currency_code: defaultCurrency?.code || baseCurrencyCode,

    debit: 0,
    credit: 0,

    exchange_rate: defaultCurrency ? Number(defaultCurrency.exchange_rate) : 1,
  };
};
