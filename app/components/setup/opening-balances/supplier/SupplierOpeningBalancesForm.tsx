// app/components/setup/opening-balances/SupplierOpeningBalancesForm.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useLoader } from "@/app/context/LoaderContext";

import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";

import type { Currency, SupplierOpeningBalanceRow } from "./types";

import SupplierOpeningBalanceToolbar from "./components/SupplierOpeningBalanceToolbar";

import SupplierOpeningBalanceTable from "./components/SupplierOpeningBalanceTable";

import { useSupplierOpeningBalances } from "./hooks/useSupplierOpeningBalances";

type Props = {
  apiBase?: string;
  redirectPath?: string;
  recordId?: string;
};

export default function SupplierOpeningBalancesForm({
  apiBase = "/api/finance/opening-balances/supplier",
  redirectPath = "/finance/opening-balances",
  recordId,
}: Props) {
  const router = useRouter();

  const { show, hide } = useLoader();

  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showSupplierModal, setShowSupplierModal] = useState(false);

  const { lines, appendSuppliers, updateLine, removeLine, loadLines } =
    useSupplierOpeningBalances(currencies, "GBP");

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

  useEffect(() => {
    if (!recordId) return;

    let cancelled = false;

    const loadRecord = async () => {
      try {
        show();
        setErrorMsg(null);

        const response = await fetch(`${apiBase}/${recordId}`);
        const result: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : "Failed to load supplier opening balance.";

          throw new Error(message);
        }

        if (
          typeof result !== "object" ||
          result === null ||
          !("data" in result) ||
          typeof result.data !== "object" ||
          result.data === null
        ) {
          throw new Error("Invalid supplier opening balance response.");
        }

        const row = result.data as Record<string, unknown>;

        if (!cancelled) {
          loadLines([
            {
              id: String(row.id ?? recordId),
              posting_date: String(row.posting_date ?? ""),
              supplier_id: String(row.party_id ?? ""),
              supplier_code: String(row.party_code ?? ""),
              supplier_name: String(row.party_name ?? ""),
              doc_type: row.doc_type as SupplierOpeningBalanceRow["doc_type"],
              doc_no: String(row.doc_no ?? ""),
              external_ref_no: String(row.external_ref_no ?? ""),
              description: String(row.description ?? ""),
              currency_id: String(row.currency_id ?? ""),
              currency_code: String(row.currency_code ?? "GBP"),
              debit: Number(row.debit ?? 0),
              credit: Number(row.credit ?? 0),
              exchange_rate: Number(row.exchange_rate ?? 1),
            },
          ]);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMsg(
            error instanceof Error
              ? error.message
              : "Failed to load supplier opening balance.",
          );
        }
      } finally {
        if (!cancelled) hide();
      }
    };

    void loadRecord();

    return () => {
      cancelled = true;
    };
  }, [recordId, apiBase, loadLines, show, hide]);

  const handleSelectSuppliers = (suppliers: SupplierLookupItem[]) => {
    appendSuppliers(
      suppliers.map((supplier) => ({
        id: supplier.id,
        code: supplier.supplier_code,
        name: supplier.name,
        currency_id: supplier.currency_id,
      })),
    );

    setShowSupplierModal(false);
  };

  const validateLines = (): string | null => {
    if (lines.length === 0) {
      return "Please select at least one supplier.";
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

    if (recordId && lines.length !== 1) {
      setErrorMsg("Edit mode requires exactly one opening balance row.");
      return;
    }

    try {
      show();

      const payload = {
        lines: lines.map((line) => ({
          party_id: line.supplier_id,
          party_code: line.supplier_code || null,
          party_name: line.supplier_name,
          posting_date: line.posting_date,
          doc_type: line.doc_type,
          doc_no: line.doc_no.trim(),
          external_ref_no: line.external_ref_no.trim(),
          description: line.description || "",
          currency_id: line.currency_id || null,
          currency_code: line.currency_code,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          exchange_rate: Number(line.exchange_rate) || 1,
        })),
      };

      const response = await fetch(
        recordId ? `${apiBase}/${recordId}` : apiBase,
        {
          method: recordId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Failed to save supplier opening balance.";

        throw new Error(message);
      }

      router.push(redirectPath);
      router.refresh();
    } catch (error) {
      console.error("Failed to save supplier opening balance:", error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to save supplier opening balance.",
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

        {!recordId && (
          <SupplierOpeningBalanceToolbar
            onSelectSupplier={() => setShowSupplierModal(true)}
          />
        )}

        <SupplierOpeningBalanceTable
          lines={lines}
          currencies={currencies}
          baseCurrencyCode={baseCurrencyCode}
          onChange={updateLine}
          onRemove={removeLine}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleSave}>
            {recordId ? "Update" : "Save"}
          </Button>

          {recordId && (
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (
                  !window.confirm(
                    "Are you sure you want to delete this supplier opening balance?",
                  )
                ) {
                  return;
                }

                try {
                  show();

                  const response = await fetch(`${apiBase}/${recordId}`, {
                    method: "DELETE",
                  });

                  const result: unknown = await response
                    .json()
                    .catch(() => null);

                  if (!response.ok) {
                    const message =
                      typeof result === "object" &&
                      result !== null &&
                      "error" in result &&
                      typeof result.error === "string"
                        ? result.error
                        : "Failed to delete supplier opening balance.";

                    throw new Error(message);
                  }

                  router.push(redirectPath);
                  router.refresh();
                } catch (error) {
                  setErrorMsg(
                    error instanceof Error
                      ? error.message
                      : "Failed to delete supplier opening balance.",
                  );
                } finally {
                  hide();
                }
              }}
            >
              Delete
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(redirectPath)}
          >
            Cancel
          </Button>
        </div>
      </div>

      {showSupplierModal && (
        <SupplierLookupModal
          open={showSupplierModal}
          multiple
          onClose={() => setShowSupplierModal(false)}
          onSelectMultiple={handleSelectSuppliers}
        />
      )}
    </div>
  );
}
/* const handleSave = async () => {
    setErrorMsg(null);

    const validationError = validateLines();

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    if (recordId && lines.length !== 1) {
    setErrorMsg("Edit mode requires exactly one opening balance row.");
    return;
  }

    try {
      show();

      const payload = {
        lines: lines.map((line: SupplierOpeningBalanceRow) => ({
          posting_date: line.posting_date,

          supplier_id: line.supplier_id,

          supplier_code: line.supplier_code,

          supplier_name: line.supplier_name,

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
        let message = "Failed to save supplier opening balances.";

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
      console.error("Failed to save supplier opening balances:", error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to save supplier opening balances.",
      );
    } finally {
      hide();
    }
  }; */
