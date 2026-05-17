// app/components/sales/quotes/SalesQuoteList.tsx

"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { SalesQuote } from "@/types/sales-quote";

type Props = {
  slug: string;
};

export default function SalesQuoteList({ slug }: Props) {
  const [rows, setRows] = useState<SalesQuote[]>([]);

  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/sales-quotes");

      const data = await res.json();

      setRows(data.rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div>Loading quotes...</div>;
  }

  return (
    <div className="border rounded overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-black">
          <tr>
            <th className="p-2 text-left">Quote No</th>

            <th className="p-2 text-left">Customer</th>

            <th className="p-2 text-left">Date</th>

            <th className="p-2 text-left">Status</th>

            <th className="p-2 text-right">Total</th>

            <th className="p-2"></th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-2">{row.quote_no}</td>

              <td className="p-2">{row.customer_name}</td>

              <td className="p-2">{row.quote_date}</td>

              <td className="p-2">{row.status}</td>

              <td className="p-2 text-right">
                {Number(row.total_amount || 0).toFixed(2)}
              </td>

              <td className="p-2 text-right">
                <Link
                  href={`/${slug}/sales/quotes/${row.id}`}
                  className="text-blue-600"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
