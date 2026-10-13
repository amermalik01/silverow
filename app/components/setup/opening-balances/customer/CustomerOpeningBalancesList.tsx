// app/components/setup/opening-balances/customer/CustomerOpeningBalancesList.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLoader } from "@/app/context/LoaderContext";

type CustomerOpeningBalanceItem = {
  id: string;
  posting_date: string;
  party_code?: string;
  party_name?: string;
  doc_type?: string;
  doc_no?: string;
  currency_code?: string;
  debit?: number | string;
  credit?: number | string;
  status?: string;
};

type Props = {
  apiBase?: string;
  onAdd: () => void;
  onEdit: (id: string) => void;
};

type ApiResult = {
  success?: boolean;
  error?: string;
  message?: string;
  data?: unknown;
};

export default function CustomerOpeningBalancesList({
  apiBase = "/api/finance/opening-balances/customer",
  onAdd,
  onEdit,
}: Props) {
  const { show, hide } = useLoader();

  const [records, setRecords] = useState<CustomerOpeningBalanceItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [postingIds, setPostingIds] = useState<string[]>([]);

  const loadRecords = useCallback(async () => {
    try {
      show();
      setErrorMsg(null);

      const response = await fetch(apiBase);
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Failed to load customer opening balances.";

        throw new Error(message);
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("data" in result) ||
        !Array.isArray(result.data)
      ) {
        throw new Error("Invalid customer opening balances response.");
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
          status: String(item.status ?? "Open"),
        })),
      );
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to load customer opening balances.",
      );
    } finally {
      hide();
    }
  }, [apiBase, show, hide]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const handlePost = async (id: string) => {
    const record = records.find((item) => item.id === id);

    if (!record) {
      setErrorMsg("Opening balance record not found.");
      return;
    }

    if (record.status === "Posted") {
      setErrorMsg("This opening balance has already been posted.");
      return;
    }

    if (postingIds.includes(id)) return;

    if (
      !window.confirm(
        `Post customer opening balance ${record.doc_no || id} to the general ledger?`,
      )
    ) {
      return;
    }

    setPostingIds((previous) => [...previous, id]);
    setErrorMsg(null);

    try {
      show();

      const response = await fetch(`${apiBase}/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: [id] }),
      });

      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Failed to post customer opening balance.";

        throw new Error(message);
      }

      const apiResult = result as ApiResult;

      if (apiResult.success === false) {
        throw new Error(
          apiResult.error || "Failed to post customer opening balance.",
        );
      }

      await loadRecords();
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to post customer opening balance.",
      );
    } finally {
      setPostingIds((previous) => previous.filter((item) => item !== id));
      hide();
    }
  };

  const handleDelete = async (id: string) => {
    const record = records.find((item) => item.id === id);

    if (record?.status === "Posted") {
      setErrorMsg("Posted opening balances cannot be deleted here.");
      return;
    }

    if (!window.confirm("Delete this customer opening balance?")) return;

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
            : "Failed to delete customer opening balance.";

        throw new Error(message);
      }

      await loadRecords();
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to delete customer opening balance.",
      );
    } finally {
      hide();
    }
  };

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-end gap-3">
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
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="p-3">Posting Date</th>
              <th className="p-3">Customer No.</th>
              <th className="p-3">Customer Name</th>
              <th className="p-3">Document Type</th>
              <th className="p-3">Document No.</th>
              <th className="p-3 text-right">Debit</th>
              <th className="p-3 text-right">Credit</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y dark:divide-slate-800">
            {records.map((record) => {
              const isPosted = record.status === "Posted";
              const isPosting = postingIds.includes(record.id);

              return (
                <tr key={record.id}>
                  <td className="whitespace-nowrap p-3">
                    {record.posting_date}
                  </td>
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
                    <span
                      className={
                        isPosted
                          ? "rounded bg-emerald-100 px-2 py-1 text-emerald-700"
                          : "rounded bg-amber-100 px-2 py-1 text-amber-700"
                      }
                    >
                      {record.status}
                    </span>
                  </td>

                  <td className="p-3">
                    <div className="flex justify-center gap-2">
                      <Button
                        type="button"
                        variant="edit"
                        disabled={isPosted || isPosting}
                        onClick={() => onEdit(record.id)}
                      >
                        Edit
                      </Button>

                      <Button
                        type="button"
                        disabled={isPosted || isPosting}
                        onClick={() => void handleDelete(record.id)}
                        variant="cancel"
                      >
                        Delete
                      </Button>

                      <Button
                        type="button"
                        disabled={isPosted || isPosting}
                        onClick={() => void handlePost(record.id)}
                      >
                        {isPosted
                          ? "Posted"
                          : isPosting
                            ? "Posting..."
                            : "Post"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {records.length === 0 && !errorMsg && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500">
                  No customer opening balances found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
