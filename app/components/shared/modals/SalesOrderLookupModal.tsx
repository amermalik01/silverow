// app/components/shared/modals/SalesOrderLookupModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export interface SalesOrderLookupItem {
  id: string;

  sales_order_id: string;
  sales_invoice_id?: string | null;

  document_type: "sales_order" | "invoice";

  posting_date: string;

  order_no: string;

  invoice_no?: string | null;

  customer_name?: string | null;
  customer_no?: string | null;

  currency_code: string;

  amount: number;
  vat_amount: number;
  total_amount: number;

  status: string;

  is_posted: boolean;

  has_invoice: boolean;
  has_invoice_pending: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (order: SalesOrderLookupItem) => void;
}

export const SalesOrderLookupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState<SalesOrderLookupItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // setLoading(true);

    const query = new URLSearchParams({
      search: searchTerm,
      limit: "50",
    });

    fetch(`/api/lookups/sales-orders?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setOrders(data.data);
        } else {
          setOrders([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching sales orders:", err);

        setOrders([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-3 bg-emerald-800 dark:bg-slate-800 text-white flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wide text-white">
            Sales Orders/Invoices
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
              placeholder="Search order/invoice no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Orders/Invoice Grid Table */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading Sales Orders/Invoices...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No sales orders or invoices found.
            </div>
          ) : (
            <table className="w-full text-left text-xs table-fixed border-collapse">
              <thead>
                <tr className="bg-emerald-800 text-white font-semibold">
                  <th className="p-2 border border-emerald-700">Type</th>

                  <th className="p-2 border border-emerald-700">
                    Posting Date
                  </th>

                  <th className="p-2 border border-emerald-700">Order No.</th>

                  <th className="p-2 border border-emerald-700">Invoice No.</th>

                  <th className="p-2 border border-emerald-700">Customer</th>

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
                {orders.map((ord) => (
                  <tr
                    key={ord.id}
                    onClick={() => onSelectOrder(ord)}
                    className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-200 dark:border-slate-800 transition"
                  >
                    {/* Type */}
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          ord.has_invoice
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {ord.has_invoice ? "INVOICE" : "SO"}
                      </span>
                    </td>

                    {/* Posting Date */}
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                      {ord.posting_date
                        ? format(ord.posting_date, "dd/MM/yyyy")
                        : "—"}
                    </td>

                    {/* Sales Order */}
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Icon
                          icon="tabler:external-link"
                          className="w-3.5 h-3.5"
                        />

                        {ord.order_no}
                      </span>
                    </td>

                    {/* Sales Invoice */}
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold">
                      <span className="flex items-center gap-1">
                        {ord.invoice_no ? (
                          <>
                            <Icon
                              icon="tabler:file-invoice"
                              className="w-3.5 h-3.5 text-blue-600"
                            />

                            <span className="text-blue-700 dark:text-blue-400">
                              {ord.invoice_no}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">Not invoiced</span>
                        )}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {ord.customer_name || "—"}
                        </span>

                        {ord.customer_no && (
                          <span className="text-[10px] text-slate-400">
                            {ord.customer_no}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Currency */}
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      {ord.currency_code || "GBP"}
                    </td>

                    {/* Amount */}
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                      {Number(ord.amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      {ord.currency_code || "GBP"}
                    </td>

                    {/* VAT */}
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                      {Number(ord.vat_amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      {ord.currency_code || "GBP"}
                    </td>

                    {/* Total */}
                    <td className="p-2 text-right font-mono font-bold">
                      {Number(ord.total_amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      {ord.currency_code || "GBP"}
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
