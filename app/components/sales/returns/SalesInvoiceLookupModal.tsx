// /app/components/sales/returns/SalesInvoiceLookupModal.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export interface SalesInvoiceLookupItem {
  id: string;
  posting_date: string;
  sales_invoice_no: string;
  order_no: string;
  currency_code: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string;
  customerName?: string;
  customerCode?: string;
  onSelectInvoice: (invoice: SalesInvoiceLookupItem) => void;
}

export const SalesInvoiceLookupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customerId,
  customerName = "",
  customerCode = "",
  onSelectInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [invoices, setInvoices] = useState<SalesInvoiceLookupItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !customerId) return;

    // setLoading(true);
    const query = new URLSearchParams({
      customer_id: customerId,
      search: searchTerm,
      limit: "50",
    });

    fetch(`/api/sales/sales-returns/sales-invoices-list?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setInvoices(data.data);
        } else {
          setInvoices([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching sales invoices:", err);
        setInvoices([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, customerId, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-3 bg-emerald-800 dark:bg-slate-800 text-white flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wide text-white">
            Sales Invoices for {customerCode} - {customerName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-emerald-700 dark:hover:bg-slate-700 rounded transition"
          >
            <Icon icon="tabler:x" className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="relative max-w-sm">
            <Icon
              icon="tabler:search"
              className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search invoice or order no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Invoice Grid Table */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading Sales Invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No posted sales invoices found for this customer.
            </div>
          ) : (
            <table className="w-full text-left text-xs table-fixed border-collapse">
              <thead>
                <tr className="bg-emerald-800 text-white font-semibold">
                  <th className="p-2 border border-emerald-700">
                    Posting Date
                  </th>
                  <th className="p-2 border border-emerald-700">Invoice No.</th>
                  <th className="p-2 border border-emerald-700">Order No.</th>
                  <th className="p-2 border border-emerald-700">Currency</th>
                  <th className="p-2 border border-emerald-700 text-right">
                    Amount
                  </th>
                  <th className="p-2 border border-emerald-700 text-right">
                    VAT
                  </th>
                  <th className="p-2 border border-emerald-700 text-right">
                    Total Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => onSelectInvoice(inv)}
                    className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-200 dark:border-slate-800 transition"
                  >
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                      {inv.posting_date
                        ? format(new Date(inv.posting_date), "dd/MM/yyyy")
                        : "—"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Icon
                          icon="tabler:external-link"
                          className="w-3.5 h-3.5"
                        />
                        {inv.sales_invoice_no}
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      {inv.order_no || "-"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      {inv.currency_code || "GBP"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                      {Number(inv.amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      {inv.currency_code || "GBP"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                      {Number(inv.vat_amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      {inv.currency_code || "GBP"}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      {Number(inv.total_amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900">
          <Button type="button" onClick={onClose} variant="cancel">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
