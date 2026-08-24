// app/components/finance/journals/JournalPostedList.tsx
/* "use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Journal } from "@/types/journal";

type Props = {
  slug: string;
  title: string;

  journalType:
    | "customer"
    | "supplier"
    | "item"
    | "general";

  apiBase: string;

  viewPath: string;
};

export default function JournalPostedList({
  title,
  journalType,
  apiBase,
  viewPath,
}: Props) {
  const [data, setData] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        type: journalType,
        status: "posted",
      });

      const res = await fetch(`${apiBase}?${params}`);

      const json: Journal[] = await res.json();
    //   const json = await res.json();

      setData(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded shadow dark:shadow-white p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          {title}
        </h2>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border table-fixed text-xs">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Entry No</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Reference</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {data?.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="p-2">
                  <Link
                    href={`${viewPath}/${row.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {row.entry_no}
                  </Link>
                </td>

                <td className="p-2">
                  {row.entry_date}
                </td>

                <td className="p-2">
                  {row.reference}
                </td>

                <td className="p-2">
                  {row.description}
                </td>

                <td className="p-2">
                  {row.is_posted ? "Posted" : "Open"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} */