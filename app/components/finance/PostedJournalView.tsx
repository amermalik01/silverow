// app/components/finance/PostedJournalView.tsx

"use client";

import { useEffect, useState } from "react";
import { Journal } from "@/types/finance";

export default function PostedJournalView({ id }: { id: string }) {
  const [data, setData] = useState<Journal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/finance/journal/${id}`)
      .then((res) => res.json())
      .then((json: Journal) => {
        setData(json);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <p>Loading journal...</p>;
  }

  if (!data) {
    return <p>Journal not found</p>;
  }

  /* ---------------- TOTALS ---------------- */

  const totalDebit = data.lines.reduce(
    (sum, l) => sum + Number(l.debit || 0),
    0
  );

  const totalCredit = data.lines.reduce(
    (sum, l) => sum + Number(l.credit || 0),
    0
  );

  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="p-6 rounded shadow dark:shadow-white space-y-6">
      {/* HEADER */}

      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Entry No</p>
          <p className="font-semibold">{data.entry_no}</p>
        </div>

        <div>
          <p className="text-gray-500">Date</p>
          <p className="font-semibold">{data.entry_date}</p>
        </div>

        <div>
          <p className="text-gray-500">Reference</p>
          <p className="font-semibold">
            {data.reference || "-"}
          </p>
        </div>

        <div>
          <p className="text-gray-500">Description</p>
          <p className="font-semibold">
            {data.description || "-"}
          </p>
        </div>
      </div>

      {/* LINES */}

      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead>
            <tr className="">
              <th className="p-2 text-left">Account</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-right">Debit</th>
              <th className="p-2 text-right">Credit</th>
            </tr>
          </thead>

          <tbody>
            {data.lines.map((line) => (
              <tr key={line.id} className="border-t">
                <td className="p-2">
                  {line.account_code} - {line.account_name}
                </td>

                <td className="p-2">
                  {line.description || "-"}
                </td>

                <td className="p-2 text-right">
                  {line.debit > 0
                    ? formatCurrency(line.debit)
                    : ""}
                </td>

                <td className="p-2 text-right">
                  {line.credit > 0
                    ? formatCurrency(line.credit)
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>

          {/* TOTAL ROW */}

          <tfoot>
            <tr className="border-t font-semibold bg-gray-50">
              <td colSpan={2} className="p-2 text-right">
                Total
              </td>

              <td className="p-2 text-right">
                {formatCurrency(totalDebit)}
              </td>

              <td className="p-2 text-right">
                {formatCurrency(totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* STATUS */}

      <div className="text-sm">
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded">
          Posted
        </span>
      </div>
    </div>
  );
}