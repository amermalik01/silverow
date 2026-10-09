// app/components/setup/opening-balances/supplier/hooks/useSupplierOpeningBalances.ts

"use client";

import { useCallback, useState } from "react";

import type { Currency, SupplierOpeningBalanceRow } from "../types";

type SupplierOpeningBalanceField = keyof SupplierOpeningBalanceRow;

type SupplierOpeningBalanceFieldValue =
  SupplierOpeningBalanceRow[SupplierOpeningBalanceField];

type SupplierParty = {
  id: string;
  code?: string;
  name: string;
  currency_id?: string;
};

export function useSupplierOpeningBalances(
  currencies: Currency[],
  baseCurrencyCode: string,
) {
  const [lines, setLines] = useState<SupplierOpeningBalanceRow[]>([]);

  const appendSuppliers = useCallback(
    (suppliers: SupplierParty[]) => {
      setLines((previous) => {
        const existingIds = new Set(previous.map((line) => line.supplier_id));

        const newRows: SupplierOpeningBalanceRow[] = suppliers
          .filter((supplier) => !existingIds.has(supplier.id))
          .map((supplier) => {
            const currency = currencies.find(
              (item) => item.id === supplier.currency_id,
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
      field: SupplierOpeningBalanceField,
      value: SupplierOpeningBalanceFieldValue,
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
            const documentType = value as SupplierOpeningBalanceRow["doc_type"];

            line.doc_type = documentType;

            /*
             * Supplier:
             *
             * Invoice    => Credit
             * Debit Note => Debit
             */
            if (documentType === "Invoice") {
              line.debit = 0;
            } else {
              line.credit = 0;
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

          case "supplier_id":
            line.supplier_id =
              typeof value === "string" ? value : line.supplier_id;
            break;

          case "supplier_code":
            line.supplier_code =
              typeof value === "string" ? value : line.supplier_code;
            break;

          case "supplier_name":
            line.supplier_name =
              typeof value === "string" ? value : line.supplier_name;
            break;

          case "currency_code":
            line.currency_code =
              typeof value === "string" ? value : line.currency_code;
            break;
        }

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

  const loadLines = useCallback((rows: SupplierOpeningBalanceRow[]) => {
    setLines(rows);
  }, []);

  return {
    lines,
    setLines,
    loadLines,
    appendSuppliers,
    updateLine,
    removeLine,
    clearLines,
  };
}
