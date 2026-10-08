// app/components/setup/opening-balances/customer/CustomerOpeningBalancesForm.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useLoader } from "@/app/context/LoaderContext";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

import type { Currency, CustomerOpeningBalanceRow } from "./types";

import CustomerOpeningBalanceToolbar from "./components/CustomerOpeningBalanceToolbar";

import CustomerOpeningBalanceTable from "./components/CustomerOpeningBalanceTable";

import { useCustomerOpeningBalances } from "./hooks/useCustomerOpeningBalances";

type Props = {
  apiBase?: string;
  redirectPath?: string;
};

export default function CustomerOpeningBalancesForm({
  apiBase = "/api/finance/opening-balances/customer",
  redirectPath = "/finance/opening-balances",
}: Props) {
  const router = useRouter();

  const { show, hide } = useLoader();

  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const { lines, appendCustomers, updateLine, removeLine } =
    useCustomerOpeningBalances(currencies, "GBP");

  const baseCurrencyObj = useMemo(
    () => currencies.find((currency) => currency.is_base) ?? null,
    [currencies],
  );

  const baseCurrencyCode = baseCurrencyObj?.code || "GBP";

  useEffect(() => {
    let cancelled = false;

    const loadCurrencies = async () => {
      try {
        const response = await fetch("/api/parties/currencies");

        if (!response.ok) {
          throw new Error("Failed to load currencies.");
        }

        const data = (await response.json()) as Currency[];

        if (!cancelled) {
          setCurrencies(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load currencies:", error);

        if (!cancelled) {
          setErrorMsg("Unable to load currencies.");
        }
      }
    };

    void loadCurrencies();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectCustomers = (customers: CustomerLookupItem[]) => {
    appendCustomers(
      customers.map((customer) => ({
        id: customer.id,
        code: customer.customer_code,
        name: customer.name,
        currency_id: customer.currency_id,
      })),
    );

    setShowCustomerModal(false);
  };

  const validateLines = (): string | null => {
    if (lines.length === 0) {
      return "Please select at least one customer.";
    }

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      if (!line.posting_date) {
        return `Posting date is required on row ${index + 1}.`;
      }

      if (!line.doc_no.trim()) {
        return `Document number is required on row ${index + 1}.`;
      }

      if (Number(line.debit) <= 0 && Number(line.credit) <= 0) {
        return `Debit or Credit amount is required on row ${index + 1}.`;
      }

      if (Number(line.debit) > 0 && Number(line.credit) > 0) {
        return `Debit and Credit cannot both have a value on row ${index + 1}.`;
      }

      if (!line.currency_id && line.currency_code !== baseCurrencyCode) {
        return `Currency is required on row ${index + 1}.`;
      }

      if (Number(line.exchange_rate) <= 0) {
        return `Exchange rate must be greater than zero on row ${index + 1}.`;
      }
    }

    return null;
  };

  const handleSave = async () => {
    setErrorMsg(null);

    const validationError = validateLines();

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      show();

      const payload = {
        lines: lines.map((line: CustomerOpeningBalanceRow) => ({
          posting_date: line.posting_date,

          customer_id: line.customer_id,

          customer_code: line.customer_code,

          customer_name: line.customer_name,

          doc_type: line.doc_type,

          doc_no: line.doc_no.trim(),

          external_ref_no: line.external_ref_no.trim(),

          currency_id: line.currency_id,

          currency_code: line.currency_code,

          debit: Number(line.debit) || 0,

          credit: Number(line.credit) || 0,

          exchange_rate: Number(line.exchange_rate) || 1,
        })),
      };

      const response = await fetch(apiBase, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        let message = "Failed to save customer opening balances.";

        if (
          typeof result === "object" &&
          result !== null &&
          "message" in result &&
          typeof result.message === "string"
        ) {
          message = result.message;
        }

        throw new Error(message);
      }

      router.push(redirectPath);
    } catch (error) {
      console.error("Failed to save customer opening balances:", error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to save customer opening balances.",
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

        <CustomerOpeningBalanceToolbar
          onSelectCustomer={() => setShowCustomerModal(true)}
        />

        <CustomerOpeningBalanceTable
          lines={lines}
          currencies={currencies}
          baseCurrencyCode={baseCurrencyCode}
          onChange={updateLine}
          onRemove={removeLine}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleSave}>
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

      {showCustomerModal && (
        <CustomerLookupModal
          open={showCustomerModal}
          multiple
          onClose={() => setShowCustomerModal(false)}
          onSelectMultiple={handleSelectCustomers}
        />
      )}
    </div>
  );
}
