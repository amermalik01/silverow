// app/components/setup/opening-balances/BankOpeningBalancesForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";
import { useLoader } from "@/app/context/LoaderContext";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";

import type { BankOpeningBalanceRow, Currency } from "./types";

import BankOpeningBalanceToolbar from "./components/BankOpeningBalanceToolbar";
import BankOpeningBalanceTable from "./components/BankOpeningBalanceTable";
import { createBankOpeningBalanceRow } from "./constants";

type Props = {
  apiBase?: string;
  redirectPath?: string;
};

type PartyInput = {
  id: string;
  code?: string;
  name: string;
  currency_id?: string;
};

/**
 * All values that can be assigned to a BankOpeningBalanceRow field.
 *
 * This replaces `any` from the old implementation.
 */
type BankOpeningBalanceFieldValue =
  BankOpeningBalanceRow[keyof BankOpeningBalanceRow];

export default function BankOpeningBalancesForm({
  apiBase = "/api/finance/opening-balances/bank",
  redirectPath = "/finance/opening-balances",
}: Props) {
  const router = useRouter();
  const { show, hide } = useLoader();

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [lines, setLines] = useState<BankOpeningBalanceRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [glModalRowIndex, setGlModalRowIndex] = useState<number | null>(null);

  /*
   * Base currency.
   *
   * The fallback keeps the page usable while currencies are loading.
   */
  const baseCurrencyObj: Currency = currencies.find(
    (currency) => currency.is_base,
  ) ?? {
    id: "",
    code: "GBP",
    name: "British Pound",
    exchange_rate: 1,
    is_base: true,
  };

  /*
   * Load currencies.
   */
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await fetch("/api/parties/currencies");

        if (!response.ok) {
          throw new Error("Failed to load currencies.");
        }

        const data: unknown = await response.json();

        if (Array.isArray(data)) {
          setCurrencies(data as Currency[]);
        } else {
          setCurrencies([]);
        }
      } catch (error: unknown) {
        console.error("Failed to load currencies:", error);
        setErrorMsg("Failed to load currencies.");
      }
    };

    void loadCurrencies();
  }, []);

  useEffect(() => {
    const loadExistingOpeningBalances = async () => {
      try {
        const response = await fetch(apiBase);
        if (!response.ok) {
          throw new Error("Failed to load existing bank opening balances.");
        }

        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          const fetchedLines: BankOpeningBalanceRow[] = result.data.map(
            (item: BankOpeningBalanceRow) => ({
              id: item.id,
              posting_date: item.posting_date,
              party_type: item.party_type,
              party_id: item.party_id,
              party_code: item.party_code || "",
              party_name: item.party_name,
              doc_type: item.doc_type,
              doc_no: item.doc_no || "",
              external_ref_no: item.external_ref_no || "",
              bank_gl_account_id: item.bank_gl_account_id,
              bank_gl_code: item.bank_gl_code || "", // populated if joined/returned
              bank_gl_name: item.bank_gl_name || "",
              currency_id: item.currency_id || "",
              currency_code: item.currency_code,
              debit: Number(item.debit || 0),
              credit: Number(item.credit || 0),
              exchange_rate: Number(item.exchange_rate || 1),
              status: item.status,
            }),
          );

          setLines(fetchedLines);
        }
      } catch (error) {
        console.error("Failed to load bank opening balances:", error);
        setErrorMsg("Failed to load existing bank opening balances.");
      }
    };

    void loadExistingOpeningBalances();
  }, [apiBase]);

  /*
   * Add selected customers/suppliers while preventing duplicates.
   */
  const appendUniquePartyRows = (
    parties: PartyInput[],
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
            baseCurrencyObj.code,
          ),
        );

      return [...previousLines, ...newRows];
    });
  };

  /*
   * Customer lookup selection.
   */
  const handleSelectCustomers = (customers: CustomerLookupItem[]) => {
    appendUniquePartyRows(
      customers.map((customer) => ({
        id: customer.id,
        code: customer.customer_code,
        name: customer.name,
        currency_id: customer.currency_id,
      })),
      "customer",
    );

    setShowCustomerModal(false);
  };

  /*
   * Supplier lookup selection.
   */
  const handleSelectSuppliers = (suppliers: SupplierLookupItem[]) => {
    appendUniquePartyRows(
      suppliers.map((supplier) => ({
        id: supplier.id,
        code: supplier.supplier_code,
        name: supplier.name,
        currency_id: supplier.currency_id,
      })),
      "supplier",
    );

    setShowSupplierModal(false);
  };

  /*
   * Update a single opening-balance row.
   *
   * IMPORTANT:
   * There is no `any` here.
   */
  const handleLineChange = (
    index: number,
    field: keyof BankOpeningBalanceRow,
    value: BankOpeningBalanceFieldValue,
  ) => {
    setLines((previousLines) => {
      const updatedLines = [...previousLines];

      const existingLine = updatedLines[index];

      if (!existingLine) {
        return previousLines;
      }

      const line: BankOpeningBalanceRow = {
        ...existingLine,
      };

      /*
       * Debit and credit are mutually exclusive.
       */
      if (field === "debit") {
        const debitValue = Number(value);

        if (debitValue > 0) {
          line.credit = 0;
        }
      }

      if (field === "credit") {
        const creditValue = Number(value);

        if (creditValue > 0) {
          line.debit = 0;
        }
      }

      /*
       * Changing currency automatically updates:
       *
       * - currency_code
       * - exchange_rate
       */
      if (field === "currency_id" && typeof value === "string") {
        const currency = currencies.find((item) => item.id === value);

        line.currency_code = currency?.code ?? baseCurrencyObj.code;

        line.exchange_rate = currency ? Number(currency.exchange_rate) : 1;
      }

      /*
       * Apply the actual field change.
       *
       * We use a small typed switch instead of `any`.
       */
      switch (field) {
        case "posting_date":
          if (typeof value === "string") {
            line.posting_date = value;
          }
          break;

        case "party_type":
          if (value === "customer" || value === "supplier") {
            line.party_type = value;
          }
          break;

        case "party_id":
          if (typeof value === "string") {
            line.party_id = value;
          }
          break;

        case "party_code":
          if (typeof value === "string" || value === undefined) {
            line.party_code = value;
          }
          break;

        case "party_name":
          if (typeof value === "string") {
            line.party_name = value;
          }
          break;

        case "doc_type":
          if (value === "Payment" || value === "Refund") {
            line.doc_type = value;
          }
          break;

        case "doc_no":
          if (typeof value === "string") {
            line.doc_no = value;
          }
          break;

        case "external_ref_no":
          if (typeof value === "string") {
            line.external_ref_no = value;
          }
          break;

        case "bank_gl_account_id":
          if (typeof value === "string") {
            line.bank_gl_account_id = value;
          }
          break;

        case "bank_gl_code":
          if (typeof value === "string" || value === undefined) {
            line.bank_gl_code = value;
          }
          break;

        case "bank_gl_name":
          if (typeof value === "string" || value === undefined) {
            line.bank_gl_name = value;
          }
          break;

        case "currency_id":
          if (typeof value === "string") {
            line.currency_id = value;
          }
          break;

        case "currency_code":
          if (typeof value === "string") {
            line.currency_code = value;
          }
          break;

        case "debit":
          line.debit = Number(value) || 0;
          break;

        case "credit":
          line.credit = Number(value) || 0;
          break;

        case "exchange_rate":
          line.exchange_rate = Number(value) || 1;
          break;

        default:
          break;
      }

      updatedLines[index] = line;

      return updatedLines;
    });
  };

  /*
   * Remove a row.
   */
  const removeRow = (index: number) => {
    setLines((previousLines) =>
      previousLines.filter((_, rowIndex) => rowIndex !== index),
    );
  };

  /*
   * Bank GL lookup selection.
   */
  const handleSelectBankGL = (record: GLAccountLookupRecord) => {
    if (glModalRowIndex === null) {
      return;
    }

    const rowIndex = glModalRowIndex;

    setLines((previousLines) => {
      const updatedLines = [...previousLines];

      const existingLine = updatedLines[rowIndex];

      if (!existingLine) {
        return previousLines;
      }

      updatedLines[rowIndex] = {
        ...existingLine,
        bank_gl_account_id: record.id,
        bank_gl_code: record.code,
        bank_gl_name: record.name,
      };

      return updatedLines;
    });

    setGlModalRowIndex(null);
  };

  /*
   * Validate rows before saving.
   */
  const validateLines = (): string | null => {
    if (lines.length === 0) {
      return "Please select at least one customer or supplier.";
    }

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      if (!line) {
        continue;
      }

      if (!line.party_id) {
        return `Row ${index + 1}: Party is required.`;
      }

      if (!line.posting_date) {
        return `Row ${index + 1}: Posting date is required.`;
      }

      if (!line.bank_gl_account_id) {
        return `Row ${index + 1}: Bank GL account is required.`;
      }

      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;

      if (debit < 0 || credit < 0) {
        return `Row ${index + 1}: Debit and credit cannot be negative.`;
      }

      if (debit > 0 && credit > 0) {
        return `Row ${index + 1}: Debit and credit cannot both have values.`;
      }

      if (debit === 0 && credit === 0) {
        return `Row ${index + 1}: Enter either a debit or credit amount.`;
      }

      if (!Number.isFinite(Number(line.exchange_rate))) {
        return `Row ${index + 1}: Invalid exchange rate.`;
      }
    }

    return null;
  };

  /*
   * Save opening balances.
   */
  const handleSave = async () => {
    setErrorMsg(null);

    const validationError = validateLines();

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    show();

    try {
      const response = await fetch(apiBase, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lines,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let message = "Failed to save bank opening balances.";
        if (
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
        ) {
          message = data.error;
        }
        throw new Error(message);
      }

      // Re-fetch existing balances to sync IDs and state properly
      const reloadResponse = await fetch(apiBase);
      const reloadResult = await reloadResponse.json();
      if (reloadResult.success && Array.isArray(reloadResult.data)) {
        setLines(
          reloadResult.data.map((item: Record<string, unknown>) => ({
            id: typeof item.id === "string" ? item.id : undefined,
            posting_date: String(item.posting_date || ""),
            party_type: item.party_type === "customer" ? "customer" : "supplier",
            party_id: String(item.party_id || ""),
            party_code: item.party_code ? String(item.party_code) : "",
            party_name: String(item.party_name || ""),
            doc_type: (item.doc_type as BankOpeningBalanceRow["doc_type"]) || "Payment",
            doc_no: String(item.doc_no || ""),
            external_ref_no: String(item.external_ref_no || ""),
            bank_gl_account_id: String(item.bank_gl_account_id || ""),
            bank_gl_code: String(item.bank_gl_code || ""),
            bank_gl_name: String(item.bank_gl_name || ""),
            currency_id: String(item.currency_id || ""),
            currency_code: String(item.currency_code || ""),
            debit: Number(item.debit || 0),
            credit: Number(item.credit || 0),
            exchange_rate: Number(item.exchange_rate || 1),
            status: (item.status as BankOpeningBalanceRow["status"]) || "Open",
          }))
        );
      }

      router.refresh();
    } catch (error: unknown) {
      console.error("Failed to save bank opening balances:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to save bank opening balances.",
      );
    } finally {
      hide();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md font-medium text-sm">
            {errorMsg}
          </div>
        )}

        <BankOpeningBalanceToolbar
          onSelectSupplier={() => setShowSupplierModal(true)}
          onSelectCustomer={() => setShowCustomerModal(true)}
        />

        <BankOpeningBalanceTable
          lines={lines}
          currencies={currencies}
          baseCurrencyCode={baseCurrencyObj.code}
          onChange={handleLineChange}
          onRemove={removeRow}
          onSelectBankGL={setGlModalRowIndex}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSave}
            disabled={lines.length === 0}
          >
            Save
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(redirectPath)}
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Supplier Lookup */}
      {showSupplierModal && (
        <SupplierLookupModal
          open={showSupplierModal}
          multiple
          onClose={() => setShowSupplierModal(false)}
          onSelectMultiple={handleSelectSuppliers}
        />
      )}

      {/* Customer Lookup */}
      {showCustomerModal && (
        <CustomerLookupModal
          open={showCustomerModal}
          multiple
          onClose={() => setShowCustomerModal(false)}
          onSelectMultiple={handleSelectCustomers}
        />
      )}

      {/* Bank GL Lookup */}
      {glModalRowIndex !== null && (
        <GLAccountLookupModal
          open={glModalRowIndex !== null}
          onClose={() => setGlModalRowIndex(null)}
          onSelect={handleSelectBankGL}
        />
      )}
    </div>
  );
}
