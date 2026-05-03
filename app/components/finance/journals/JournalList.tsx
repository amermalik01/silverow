// app/components/finance/journals/JournalList.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface JournalListItem {
  id: string;
  entry_no: number;
  entry_date: string;
  reference?: string;
  is_posted: boolean;
}

type Props = {
  slug: string;

  title: string;

  journalType:
  | "customer"
  | "supplier"
  | "item"
  | "general";

  apiBase: string;

  createPath: string;
};

export default function JournalList({
  slug,
  title,
  apiBase,
  createPath,
}: Props) {
  const [data, setData] = useState<JournalListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${apiBase}?status=unposted`);

      const result = await res.json();

      setData(result.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePost = async (id: string) => {
    const confirmed = confirm("Post this journal?");

    if (!confirmed) return;

    try {
      await fetch(`${apiBase}/${id}/post`, {
        method: "POST",
      });

      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 rounded shadow dark:shadow-white space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{title}</h2>

        <Link
          href={createPath}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New
        </Link>
      </div>

      {loading ? (
        <p>Loading journals...</p>
      ) : (
        <table className="w-full border text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Entry No</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Reference</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="p-2">
                  <Link
                    href={`${createPath.replace("/create", "")}/${row.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {row.entry_no}
                  </Link>
                </td>

                <td className="p-2">{row.entry_date}</td>

                <td className="p-2">{row.reference}</td>

                <td className="p-2">{row.is_posted ? "Posted" : "Open"}</td>

                <td className="p-2">
                  {!row.is_posted && (
                    <button
                      onClick={() => handlePost(row.id)}
                      className="text-green-600 hover:underline"
                    >
                      Post
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
