// app/components/purchases/purchase-invoices/PostedTransactionsModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

export interface PostedLedgerEntry {
  entry_no: number | string;
  posting_date: string;
  document_type: string;
  document_number: string;
  gl_no: string;
  name: string;
  source_no: string;
  debit: number;
  credit: number;
  amount_lcy: number;
  user_id: string;
  created_at?: string;
}

interface PostedTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: string;
  invoiceNo?: string;
}

export const PostedTransactionsModal: React.FC<
  PostedTransactionsModalProps
> = ({ isOpen, onClose, invoiceId, invoiceNo }) => {
  const [entries, setEntries] = useState<PostedLedgerEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [postedInfo, setPostedInfo] = useState<{
    user: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !invoiceId) return;

    async function fetchLedgerEntries() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/purchase-invoices/${invoiceId}/posted-entries`,
        );
        const json = await res.json();
        if (json.success) {
          setEntries(json.data || []);
          if (json.posted_by) {
            setPostedInfo({
              user: json.posted_by,
              date: json.posted_at || "",
            });
          }
        }
      } catch (err) {
        console.error("Failed to load posted entries:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLedgerEntries();
  }, [isOpen, invoiceId]);

  if (!isOpen) return null;

  const filteredEntries = entries.filter(
    (e) =>
      e.gl_no?.toLowerCase().includes(search.toLowerCase()) ||
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.source_no?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-6xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Modal Header matching Legacy Dark Green styling */}
        <div className="bg-[#1b431c] text-white px-6 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide text-white">
            Accounting Entries for Purchase Invoice No. {invoiceNo || "Draft"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <Icon icon="tabler:x" className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-start">
          <div className="relative w-full max-w-sm">
            <Icon
              icon="tabler:search"
              className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Loading ledger transactions...
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#1b431c] text-white text-[11px] capitalize tracking-wider">
                  <tr>
                    <th className="p-2.5 font-semibold">Posting Date</th>
                    <th className="p-2.5 font-semibold">Document Type</th>
                    <th className="p-2.5 font-semibold">Document Number</th>
                    <th className="p-2.5 font-semibold">G/L No.</th>
                    <th className="p-2.5 font-semibold">Name</th>
                    <th className="p-2.5 font-semibold">Source No.</th>
                    <th className="p-2.5 font-semibold text-right">Debit</th>
                    <th className="p-2.5 font-semibold text-right">Credit</th>
                    <th className="p-2.5 font-semibold text-right">
                      Amount LCY
                    </th>
                    <th className="p-2.5 font-semibold">User ID</th>
                    <th className="p-2.5 font-semibold">Entry No.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="p-4 text-center text-slate-500"
                      >
                        No accounting entries found for this document.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((row, idx) => (
                      <tr
                        key={row.entry_no || idx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="p-2.5 whitespace-nowrap">
                          {row.posting_date
                            ? new Date(row.posting_date).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="p-2.5">
                          {row.document_type || "Purchase Invoice"}
                        </td>
                        <td className="p-2.5 font-semibold">
                          {row.document_number || invoiceNo}
                        </td>
                        <td className="p-2.5 font-semibold">{row.gl_no}</td>
                        <td className="p-2.5 font-sans font-medium">
                          {row.name}
                        </td>
                        <td className="p-2.5">{row.source_no || "-"}</td>
                        <td className="p-2.5 text-right font-semibold">
                          {Number(row.debit || 0) > 0
                            ? Number(row.debit).toFixed(2)
                            : ""}
                        </td>
                        <td className="p-2.5 text-right font-semibold">
                          {Number(row.credit || 0) > 0
                            ? Number(row.credit).toFixed(2)
                            : ""}
                        </td>
                        <td className="p-2.5 text-right font-semibold">
                          {Number(row.amount_lcy || 0) < 0
                            ? `(${Math.abs(Number(row.amount_lcy)).toFixed(2)})`
                            : Number(row.amount_lcy || 0).toFixed(2)}
                        </td>
                        <td className="p-2.5 font-sans">
                          {row.user_id || "-"}
                        </td>
                        <td className="p-2.5">{row.entry_no}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Posting Stamp Footer */}
          {postedInfo && (
            <div className="mt-3 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Posted By {postedInfo.user} On {postedInfo.date}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
