// app/components/setup/opening-balances/bank/hooks/useBankOpeningBalances.ts

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  BankOpeningBalanceRow,
  Currency,
  EditableBankOpeningBalanceField,
} from "../types";

import {
  createBankOpeningBalanceRow,
  type BankOpeningBalanceParty,
} from "../constants";

type UseBankOpeningBalancesProps = {
  apiBase: string;
};

export const useBankOpeningBalances = ({
  apiBase,
}: UseBankOpeningBalancesProps) => {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [lines, setLines] = useState<BankOpeningBalanceRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [glModalRowIndex, setGlModalRowIndex] = useState<number | null>(null);

  const baseCurrencyObj = useMemo(
    () =>
      currencies.find((currency) => currency.is_base) || {
        id: "",
        code: "GBP",
        name: "British Pound",
        exchange_rate: 1,
        is_base: true,
      },
    [currencies],
  );

  const baseCurrencyCode = baseCurrencyObj.code;

  /**
   * Load currencies.
   */
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await fetch("/api/parties/currencies");

        if (!response.ok) {
          throw new Error("Failed to load currencies.");
        }

        const data: Currency[] = await response.json();

        setCurrencies(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load currencies:", error);

        setErrorMsg("Failed to load currencies.");
      }
    };

    loadCurrencies();
  }, []);

  /**
   * Add multiple customers/suppliers.
   *
   * Duplicate party IDs are ignored for the same party type.
   */
  const appendUniquePartyRows = useCallback(
    (
      parties: BankOpeningBalanceParty[],
      partyType: "customer" | "supplier",
    ) => {
      setLines((previousLines) => {
        const existingIds = new Set(
          previousLines
            .filter((line) => line.party_type === partyType)
            .map((line) => line.party_id),
        );

        const newRows = parties
          .filter((party) => !existingIds.has(party.id))
          .map((party) =>
            createBankOpeningBalanceRow(
              party,
              partyType,
              currencies,
              baseCurrencyCode,
            ),
          );

        return [...previousLines, ...newRows];
      });
    },
    [currencies, baseCurrencyCode],
  );

  /**
   * Change a row field.
   *
   * Generic typing means:
   *
   * "debit"       -> number
   * "credit"      -> number
   * "doc_no"      -> string
   * "posting_date"-> string
   * etc.
   */
  const handleLineChange = useCallback(
    <K extends EditableBankOpeningBalanceField>(
      index: number,
      field: K,
      value: BankOpeningBalanceRow[K],
    ) => {
      setLines((previousLines) => {
        const updatedLines = [...previousLines];

        const currentLine = updatedLines[index];

        if (!currentLine) {
          return previousLines;
        }

        const updatedLine: BankOpeningBalanceRow = {
          ...currentLine,
        };

        if (field === "debit") {
          const debitValue = Number(value);

          updatedLine.debit = debitValue;

          if (debitValue > 0) {
            updatedLine.credit = 0;
          }
        } else if (field === "credit") {
          const creditValue = Number(value);

          updatedLine.credit = creditValue;

          if (creditValue > 0) {
            updatedLine.debit = 0;
          }
        } else if (field === "currency_id") {
          const currencyId = String(value);

          updatedLine.currency_id = currencyId;

          const selectedCurrency = currencies.find(
            (currency) => currency.id === currencyId,
          );

          if (selectedCurrency) {
            updatedLine.currency_code = selectedCurrency.code;
            updatedLine.exchange_rate = Number(selectedCurrency.exchange_rate);
          } else {
            updatedLine.currency_code = baseCurrencyCode;
            updatedLine.exchange_rate = 1;
          }
        } else {
          updatedLine[field] = value;
        }

        updatedLines[index] = updatedLine;

        return updatedLines;
      });
    },
    [currencies, baseCurrencyCode],
  );

  /**
   * Remove a line.
   */
  const removeRow = useCallback((index: number) => {
    setLines((previousLines) =>
      previousLines.filter((_, lineIndex) => lineIndex !== index),
    );
  }, []);

  /**
   * Select the bank G/L account for a row.
   */
  const handleSelectBankGL = useCallback(
    (
      index: number,
      record: {
        id: string;
        code?: string;
        name?: string;
      },
    ) => {

      setLines((previousLines) => {
        const updatedLines = [...previousLines];

        const currentLine = updatedLines[index];

        if (!currentLine) {
          return previousLines;
        }

        updatedLines[index] = {
          ...currentLine,
          bank_gl_account_id: record.id,
          bank_gl_code: record.code || "",
          bank_gl_name: record.name || "",
        };

        return updatedLines;
      });

    //   setGlModalRowIndex(null);
    },
    [glModalRowIndex],
  );

  /**
   * Calculate LCY amount for a line.
   */
  const calculateAmountLCY = useCallback(
    (line: BankOpeningBalanceRow): number => {
      return (
        (Number(line.debit || 0) - Number(line.credit || 0)) *
        Number(line.exchange_rate || 1)
      );
    },
    [],
  );

  /**
   * Total LCY.
   */
  const totalLCY = useMemo(() => {
    return lines.reduce((total, line) => total + calculateAmountLCY(line), 0);
  }, [lines, calculateAmountLCY]);

  /**
   * Validate before save.
   */
  const validate = useCallback((): boolean => {
    setErrorMsg(null);

    if (lines.length === 0) {
      setErrorMsg("Please select at least one customer or supplier.");
      return false;
    }

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];

      if (!line.bank_gl_account_id) {
        setErrorMsg(`Line ${index + 1}: Please select a Bank G/L Account.`);

        return false;
      }

      if (Number(line.debit || 0) === 0 && Number(line.credit || 0) === 0) {
        setErrorMsg(
          `Line ${index + 1}: Please enter either a Debit or Credit amount.`,
        );

        return false;
      }

      if (Number(line.exchange_rate || 0) <= 0) {
        setErrorMsg(
          `Line ${index + 1}: Exchange rate must be greater than zero.`,
        );

        return false;
      }
    }

    return true;
  }, [lines]);

  /**
   * Save the opening balances.
   */
  const save = useCallback(async (): Promise<boolean> => {
    if (!validate()) {
      return false;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const response = await fetch(apiBase, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lines,
        }),
      });

      if (!response.ok) {
        const errorData: { error?: string } = await response.json();

        throw new Error(
          errorData.error || "Failed to save bank opening balances.",
        );
      }

      return true;
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      );

      return false;
    } finally {
      setLoading(false);
    }
  }, [apiBase, lines, validate]);

  return {
    currencies,
    lines,

    errorMsg,
    loading,

    baseCurrencyCode,

    showSupplierModal,
    showCustomerModal,
    glModalRowIndex,

    setShowSupplierModal,
    setShowCustomerModal,
    setGlModalRowIndex,

    appendUniquePartyRows,

    handleLineChange,
    removeRow,
    handleSelectBankGL,

    calculateAmountLCY,
    totalLCY,

    save,
    setErrorMsg,
  };
};
