// app/components/setup/opening-balances/supplier/SupplierOpeningBalancesList.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { useLoader } from "@/app/context/LoaderContext";

type SupplierOpeningBalanceItem = {
  id: string;
  posting_date: string;
  party_code?: string;
  party_name?: string;
  doc_type?: string;
  doc_no?: string;
  currency_code?: string;
  debit?: number | string;
  credit?: number | string;
};

type Props = {
  apiBase?: string;
  onAdd: () => void;
  onEdit: (id: string) => void;
};

export default function SupplierOpeningBalancesList({
  apiBase = "/api/finance/opening-balances/supplier",
  onAdd,
  onEdit,
}: Props) {
  const { show, hide } = useLoader();

  const [records, setRecords] = useState<SupplierOpeningBalanceItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      show();
      setErrorMsg(null);

      const response = await fetch(apiBase);
      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error("Failed to load supplier opening balances.");
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("data" in result) ||
        !Array.isArray(result.data)
      ) {
        throw new Error("Invalid supplier opening balances response.");
      }

      setRecords(
        result.data.map((item: Record<string, unknown>) => ({
          id: String(item.id ?? ""),
          posting_date: String(item.posting_date ?? ""),
          party_code: String(item.party_code ?? ""),
          party_name: String(item.party_name ?? ""),
          doc_type: String(item.doc_type ?? ""),
          doc_no: String(item.doc_no ?? ""),
          currency_code: String(item.currency_code ?? ""),
          debit: Number(item.debit ?? 0),
          credit: Number(item.credit ?? 0),
        })),
      );
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to load supplier opening balances.",
      );
    } finally {
      hide();
    }
  }, [apiBase, show, hide]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this supplier opening balance?")) return;

    try {
      show();
      setErrorMsg(null);

      const response = await fetch(`${apiBase}/${id}`, {
        method: "DELETE",
      });

      const result: unknown = await response.json().catch(() => null);

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

      await loadRecords();
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to delete supplier opening balance.",
      );
    } finally {
      hide();
    }
  };

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {/* <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Supplier Opening Balances
          </h3>
          <p className="text-sm text-slate-500">
            View and manage supplier opening balance entries.
          </p>
        </div> */}

        <Button onClick={onAdd} variant="add_line">
          Add Opening Balance
        </Button>
      </div>

      {errorMsg && (
        <div className="rounded-md bg-red-100 p-3 text-sm text-red-700">
          {errorMsg}
          <Button variant="ghost" size="sm" onClick={() => void loadRecords()}>
            Retry
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="p-3">Posting Date</th>
              <th className="p-3">Supplier No.</th>
              <th className="p-3">Supplier Name</th>
              <th className="p-3">Document Type</th>
              <th className="p-3">Document No.</th>
              <th className="p-3 text-right">Debit</th>
              <th className="p-3 text-right">Credit</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y dark:divide-slate-800">
            {records.map((record) => (
              <tr key={record.id}>
                <td className="whitespace-nowrap p-3">{record.posting_date}</td>
                <td className="p-3">{record.party_code}</td>
                <td className="p-3">{record.party_name}</td>
                <td className="p-3">{record.doc_type}</td>
                <td className="p-3">{record.doc_no}</td>
                <td className="p-3 text-right">
                  {Number(record.debit ?? 0).toFixed(2)}
                </td>
                <td className="p-3 text-right">
                  {Number(record.credit ?? 0).toFixed(2)}
                </td>
                <td className="p-3">
                  <div className="flex justify-center gap-2">
                    <Button
                      type="button"
                      variant="edit"
                      onClick={() => onEdit(record.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => void handleDelete(record.id)}
                      variant="cancel"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {records.length === 0 && !errorMsg && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No supplier opening balances found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
