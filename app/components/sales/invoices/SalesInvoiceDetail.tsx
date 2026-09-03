// /app/components/sales/invoices/SalesInvoiceDetail.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";

interface InvoiceHeader {
  id: string;
  invoice_no: string;
  customer_name: string;
  invoice_date: string;
  subtotal: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  status: string;
  is_posted: boolean;
  posted_at: string | null;
  notes: string | null;
}

interface InvoiceLine {
  id: string;
  line_no: number;
  line_type: "ITEM" | "GL_ACCOUNT";
  item_code: string | null;
  item_name: string | null;
  account_code: string | null;
  account_name: string | null;
  description: string | null;
  warehouse_name: string | null;
  quantity: string | number;
  unit_price: string | number;
  discount_amount: string | number;
  vat_amount: string | number;
  line_total: string | number;
}

export default function SalesInvoiceDetail({
  slug,
  invoiceId,
}: {
  slug: string;
  invoiceId: string;
}) {
  const [data, setData] = useState<{
    invoice: InvoiceHeader;
    lines: InvoiceLine[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sales/sales-invoices/${invoiceId}`)
      .then((res) => {
        if (!res.ok)
          throw new Error("Failed to load operational invoice profile data");
        return res.json();
      })
      .then((payload) => setData(payload))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (loading)
    return (
      <div className="p-6 text-xs font-medium text-gray-500 animate-pulse">
        Loading Invoice Parameters...
      </div>
    );
  if (error || !data)
    return (
      <div className="p-6 text-xs font-semibold text-red-500">
        ⚠️ Error: {error || "Invoice context unreachable"}
      </div>
    );

  const { invoice, lines } = data;

  return (
    <div className="space-y-6 p-4">
      {/* Top Action Ribbon Navigation */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <Link
            href={`/${slug}/sales/invoices`}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            &larr; Back to Invoices
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Invoice {invoice.invoice_no}
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              invoice.is_posted
                ? "bg-green-100 text-green-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {invoice.is_posted ? "Posted" : "Draft / Open"}
          </span>
        </div>
      </div>

      {/* Meta Header Information Information Panel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 border rounded-lg shadow-sm">
        <div>
          <label className="block text-xs font-bold text-gray-400 capitalize tracking-wider">
            Customer / Bill To
          </label>
          <p className="text-xs font-semibold text-gray-800 mt-1">
            {invoice.customer_name || "Unassigned Customer Walk-In"}
          </p>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 capitalize tracking-wider">
            Posting Date
          </label>
          <p className="text-xs font-medium text-gray-800 mt-1">
            {invoice.invoice_date
              ? format(invoice.invoice_date, "dd/MM/yyyy")
              : "—"}
          </p>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 capitalize tracking-wider">
            Financial Audit Stamp
          </label>
          <p className="text-xs font-mono text-gray-600 mt-1">
            {invoice.is_posted && invoice.posted_at
              ? new Date(invoice.posted_at).toLocaleString()
              : "Awaiting Ledger Execution"}
          </p>
        </div>
      </div>

      {/* Line Items Functional Matrix Table */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full text-xs table-fixed text-left">
          <thead className="bg-gray-50 border-b font-medium text-gray-600">
            <tr>
              <th className="p-3 w-12 text-center">#</th>
              <th className="p-3">Type</th>
              <th className="p-3">Item / Account Allocation</th>
              <th className="p-3">Location</th>
              <th className="p-3 text-right">Qty</th>
              <th className="p-3 text-right">Unit Price</th>
              <th className="p-3 text-right">Tax (VAT)</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {lines.map((line, idx) => (
              <tr
                key={line.id}
                className="hover:bg-gray-50/70 transition-colors"
              >
                <td className="p-3 text-center text-gray-400 font-mono">
                  {idx + 1}
                </td>
                <td className="p-3">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono capitalize tracking-tight ${
                      line.line_type === "ITEM"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {line.line_type}
                  </span>
                </td>
                <td className="p-3">
                  {line.line_type === "ITEM" ? (
                    <div>
                      <div className="font-semibold text-gray-900">
                        {line.item_name}
                      </div>
                      {line.item_code && (
                        <div className="text-xs font-mono text-gray-400">
                          {line.item_code}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold text-blue-900">
                        {line.account_name || line.description}
                      </div>
                      {line.account_code && (
                        <div className="text-xs font-mono text-blue-500">
                          GL: {line.account_code}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 text-gray-500">
                  {line.warehouse_name || (
                    <span className="text-gray-300 font-serif">—</span>
                  )}
                </td>
                <td className="p-3 text-right font-mono">
                  {Number(line.quantity).toFixed(0)}
                </td>
                <td className="p-3 text-right font-mono">
                  ${Number(line.unit_price).toFixed(2)}
                </td>
                <td className="p-3 text-right text-gray-500 font-mono">
                  ${Number(line.vat_amount).toFixed(2)}
                </td>
                <td className="p-3 text-right font-semibold font-mono text-gray-900">
                  ${Number(line.line_total).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Aggregated Financial Ledger Totals Block Layout */}
        <div className="bg-gray-50/50 p-4 border-t flex flex-col items-end space-y-1.5 text-xs">
          <div className="w-[280px] flex justify-between text-gray-600">
            <span>Net Subtotal:</span>
            <span className="font-mono">
              ${Number(invoice.subtotal).toFixed(2)}
            </span>
          </div>
          <div className="w-[280px] flex justify-between text-gray-600">
            <span>Tax Amount (VAT):</span>
            <span className="font-mono">
              ${Number(invoice.tax_amount).toFixed(2)}
            </span>
          </div>
          <div className="w-[280px] flex justify-between text-base font-bold text-gray-900 border-t pt-1.5 mt-1">
            <span>Total Invoice Value:</span>
            <span className="font-mono">
              ${Number(invoice.total_amount).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Optional Remarks Handling Block Section */}
      {invoice.notes && (
        <div className="p-4 border rounded-lg bg-gray-50 text-xs text-gray-600">
          <span className="font-bold block text-gray-500 capitalize tracking-wider mb-1">
            Remarks & Internal Statements
          </span>
          {invoice.notes}
        </div>
      )}
    </div>
  );
}
