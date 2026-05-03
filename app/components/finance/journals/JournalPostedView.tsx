// app/components/finance/journals/JournalPostedView.tsx
"use client";

import { useEffect, useState } from "react";

import {
  Journal,
  JournalLine,
} from "@/types/journal";

type Props = {
  id: string;
  apiBase: string;
};

type JournalResponse = {
  journal: Journal;
  lines: JournalLine[];
};

export default function JournalPostedView({
  id,
  apiBase,
}: Props) {
  const [journal, setJournal] =
    useState<Journal | null>(null);

  const [lines, setLines] = useState<JournalLine[]>(
    [],
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${apiBase}/${id}`);

      const data: JournalResponse = await res.json();

      setJournal(data.journal);
      setLines(data.lines || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p>Loading journal...</p>;
  }

  if (!journal) {
    return <p>Journal not found</p>;
  }

  const totalDebit = lines.reduce(
    (sum, line) => sum + Number(line.debit || 0),
    0,
  );

  const totalCredit = lines.reduce(
    (sum, line) => sum + Number(line.credit || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="rounded shadow dark:shadow-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">
              Entry No
            </label>

            <div className="border rounded p-2 bg-gray-50 dark:bg-gray-900">
              {journal.entry_no}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              Entry Date
            </label>

            <div className="border rounded p-2 bg-gray-50 dark:bg-gray-900">
              {journal.entry_date}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              Reference
            </label>

            <div className="border rounded p-2 bg-gray-50 dark:bg-gray-900">
              {journal.reference || "-"}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              Status
            </label>

            <div className="border rounded p-2 bg-gray-50 dark:bg-gray-900">
              {journal.is_posted ? "Posted" : "Open"}
            </div>
          </div>

          <div className="col-span-2">
            <label className="text-sm font-medium">
              Description
            </label>

            <div className="border rounded p-2 bg-gray-50 dark:bg-gray-900 min-h-[80px]">
              {journal.description || "-"}
            </div>
          </div>
        </div>
      </div>

      {/* LINES */}

      <div className="rounded shadow dark:shadow-white p-6">
        <h2 className="text-lg font-semibold mb-4">
          Journal Lines
        </h2>

        <table className="w-full border text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">
                Account
              </th>

              <th className="p-2 text-left">
                Description
              </th>

              <th className="p-2 text-right">
                Debit
              </th>

              <th className="p-2 text-right">
                Credit
              </th>
            </tr>
          </thead>

          <tbody>
            {lines.map((line) => (
              <tr
                key={line.id}
                className="border-b"
              >
                <td className="p-2">
                  {line.account_name ||
                    line.account_id}
                </td>

                <td className="p-2">
                  {line.description}
                </td>

                <td className="p-2 text-right">
                  {Number(line.debit || 0).toFixed(2)}
                </td>

                <td className="p-2 text-right">
                  {Number(line.credit || 0).toFixed(2)}
                </td>
              </tr>
            ))}

            {/* TOTAL */}

            <tr className="font-semibold border-t">
              <td
                className="p-2 text-right"
                colSpan={2}
              >
                Total
              </td>

              <td className="p-2 text-right">
                {totalDebit.toFixed(2)}
              </td>

              <td className="p-2 text-right">
                {totalCredit.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}