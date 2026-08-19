// app/components/purchases/debit-notes/PurchaseInvoiceLookupModal.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";

export interface PurchaseInvoiceLookupItem {
  id: string;
  posting_date: string;
  invoice_no: string;
  supplier_invoice_no?: string;
  currency_code: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplierId?: string;
  supplierName?: string;
  supplierCode?: string;
  onSelectInvoice: (invoice: PurchaseInvoiceLookupItem) => void;
}

export const PurchaseInvoiceLookupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  supplierId,
  supplierName = "",
  supplierCode = "",
  onSelectInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [invoices, setInvoices] = useState<PurchaseInvoiceLookupItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !supplierId) return;

    // setLoading(true);
    const query = new URLSearchParams({
      supplier_id: supplierId,
      search: searchTerm,
      limit: "50",
    });

    fetch(`/api/debit-notes/purchase-invoices-list?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setInvoices(data.data);
        } else {
          setInvoices([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching supplier invoices:", err);
        setInvoices([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, supplierId, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-3 bg-emerald-800 dark:bg-slate-800 text-white flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wide text-white">
            Purchase Invoices for {supplierCode} - {supplierName}
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
              placeholder="Search invoice no..."
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
              Loading Purchase Invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No posted purchase invoices found for this supplier.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-800 text-white font-semibold">
                  <th className="p-2 border border-emerald-700">Posting Date</th>
                  <th className="p-2 border border-emerald-700">Invoice No.</th>
                  <th className="p-2 border border-emerald-700">Suppl. Inv. No.</th>
                  <th className="p-2 border border-emerald-700">Currency</th>
                  <th className="p-2 border border-emerald-700 text-right">Amount</th>
                  <th className="p-2 border border-emerald-700 text-right">VAT</th>
                  <th className="p-2 border border-emerald-700 text-right">Total Amount</th>
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
                        ? new Date(inv.posting_date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Icon icon="tabler:external-link" className="w-3.5 h-3.5" />
                        {inv.invoice_no}
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      {inv.supplier_invoice_no || "-"}
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
          <Button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

/* "use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

export interface PurchaseInvoiceLookupItem {
  id: string;
  posting_date: string;
  invoice_no: string;
  supplier_invoice_no?: string;
  currency_code: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplierId?: string;
  supplierName?: string;
  supplierCode?: string;
  onSelectInvoice: (invoice: PurchaseInvoiceLookupItem) => void;
}

export const PurchaseInvoiceLookupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  supplierId,
  supplierName = "",
  supplierCode = "",
  onSelectInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [invoices, setInvoices] = useState<PurchaseInvoiceLookupItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !supplierId) return;

    // setLoading(true);
    fetch(`/api/purchase-invoices?supplier_id=${supplierId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setInvoices(data.data);
        } else {
          setInvoices([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching supplier invoices:", err);
        setInvoices([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, supplierId]);

  if (!isOpen) return null;

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.supplier_invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">

        <div className="p-3 bg-emerald-800 dark:bg-slate-800 text-white flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wide">
            Purchase Invoices for {supplierCode} - {supplierName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-emerald-700 dark:hover:bg-slate-700 rounded transition"
          >
            <Icon icon="tabler:x" className="w-4 h-4" />
          </button>
        </div>


        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="relative max-w-sm">
            <Icon
              icon="tabler:search"
              className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search invoice no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 outline-none focus:border-emerald-600"
            />
          </div>
        </div>


        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading Purchase Invoices...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No posted purchase invoices found for this supplier.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-800 text-white font-semibold">
                  <th className="p-2 border border-emerald-700">
                    Posting Date
                  </th>
                  <th className="p-2 border border-emerald-700">Invoice No.</th>
                  <th className="p-2 border border-emerald-700">
                    Suppl. Inv. No.
                  </th>
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
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => onSelectInvoice(inv)}
                    className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-200 dark:border-slate-800 transition"
                  >
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                      {inv.posting_date
                        ? new Date(inv.posting_date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Icon
                          icon="tabler:external-link"
                          className="w-3.5 h-3.5"
                        />
                        {inv.invoice_no}
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      {inv.supplier_invoice_no || "-"}
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


        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900">
          <Button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
 */