// app/components/setup/opening-balances/customer/hooks/useCustomerOpeningBalances.ts

"use client";

import { useCallback, useState } from "react";

import type { CustomerOpeningBalanceRow, Currency } from "../types";

type CustomerOpeningBalanceField = keyof CustomerOpeningBalanceRow;

type CustomerOpeningBalanceFieldValue =
  CustomerOpeningBalanceRow[CustomerOpeningBalanceField];

type CustomerParty = {
  id: string;
  code?: string;
  name: string;
  currency_id?: string;
};

export function useCustomerOpeningBalances(
  currencies: Currency[],
  baseCurrencyCode: string,
) {
  const [lines, setLines] = useState<CustomerOpeningBalanceRow[]>([]);

  const appendCustomers = useCallback(
    (customers: CustomerParty[]) => {
      setLines((previous) => {
        const existingIds = new Set(previous.map((line) => line.customer_id));

        const newRows: CustomerOpeningBalanceRow[] = customers
          .filter((customer) => !existingIds.has(customer.id))
          .map((customer) => {
            const currency = currencies.find(
              (item) => item.id === customer.currency_id,
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

              currency_code: currency?.code || baseCurrencyCode,

              debit: 0,
              credit: 0,

              exchange_rate: currency ? Number(currency.exchange_rate) : 1,
            };
          });

        return [...previous, ...newRows];
      });
    },
    [currencies, baseCurrencyCode],
  );

  const updateLine = useCallback(
    (
      index: number,
      field: CustomerOpeningBalanceField,
      value: CustomerOpeningBalanceFieldValue,
    ) => {
      setLines((previous) => {
        if (!previous[index]) {
          return previous;
        }

        const updated = [...previous];
        const line = {
          ...updated[index],
        };

        switch (field) {
          case "doc_type": {
            const documentType = value as CustomerOpeningBalanceRow["doc_type"];

            line.doc_type = documentType;

            if (documentType === "Invoice") {
              line.credit = 0;
            } else {
              line.debit = 0;
            }

            break;
          }

          case "debit": {
            const debit = Number(value) || 0;

            line.debit = debit;

            if (debit > 0) {
              line.credit = 0;
            }

            break;
          }

          case "credit": {
            const credit = Number(value) || 0;

            line.credit = credit;

            if (credit > 0) {
              line.debit = 0;
            }

            break;
          }

          case "currency_id": {
            const currency = currencies.find((item) => item.id === value);

            line.currency_id =
              typeof value === "string" ? value : line.currency_id;

            line.currency_code = currency?.code || baseCurrencyCode;

            line.exchange_rate = currency ? Number(currency.exchange_rate) : 1;

            break;
          }

          case "posting_date":
            line.posting_date =
              typeof value === "string" ? value : line.posting_date;
            break;

          case "doc_no":
            line.doc_no = typeof value === "string" ? value : line.doc_no;
            break;

          case "external_ref_no":
            line.external_ref_no =
              typeof value === "string" ? value : line.external_ref_no;
            break;

          case "exchange_rate":
            line.exchange_rate = Number(value) || 1;
            break;

          case "customer_id":
            line.customer_id =
              typeof value === "string" ? value : line.customer_id;
            break;

          case "customer_code":
            line.customer_code =
              typeof value === "string" ? value : line.customer_code;
            break;

          case "customer_name":
            line.customer_name =
              typeof value === "string" ? value : line.customer_name;
            break;

          case "currency_code":
            line.currency_code =
              typeof value === "string" ? value : line.currency_code;
            break;
        }

        // if (field === "doc_type") {
        //   const documentType = value as CustomerOpeningBalanceRow["doc_type"];

        //   line.doc_type = documentType;

        //   if (documentType === "Invoice") {
        //     line.credit = 0;
        //   }

        //   if (documentType === "Credit Note") {
        //     line.debit = 0;
        //   }
        // }

        // if (field === "debit") {
        //   const debit = Number(value) || 0;

        //   line.debit = debit;

        //   if (debit > 0) {
        //     line.credit = 0;
        //   }
        // }

        // if (field === "credit") {
        //   const credit = Number(value) || 0;

        //   line.credit = credit;

        //   if (credit > 0) {
        //     line.debit = 0;
        //   }
        // }

        // if (field === "currency_id") {
        //   const currency = currencies.find((item) => item.id === value);

        //   line.currency_id =
        //     typeof value === "string" ? value : line.currency_id;

        //   line.currency_code = currency?.code || baseCurrencyCode;

        //   line.exchange_rate = currency ? Number(currency.exchange_rate) : 1;
        // }

        // if (
        //   field !== "doc_type" &&
        //   field !== "debit" &&
        //   field !== "credit" &&
        //   field !== "currency_id"
        // ) {
        //   (line as CustomerOpeningBalanceRow)[field] = value as never;
        // }

        updated[index] = line;

        return updated;
      });
    },
    [currencies, baseCurrencyCode],
  );

  const removeLine = useCallback((index: number) => {
    setLines((previous) =>
      previous.filter((_, lineIndex) => lineIndex !== index),
    );
  }, []);

  const clearLines = useCallback(() => {
    setLines([]);
  }, []);

  const loadLines = useCallback((rows: CustomerOpeningBalanceRow[]) => {
    setLines(rows);
  }, []);

  return {
    lines,
    setLines,
    loadLines,
    appendCustomers,
    updateLine,
    removeLine,
    clearLines,
  };
}
