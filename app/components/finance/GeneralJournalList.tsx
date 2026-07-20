// app/components/finance/GeneralJournalList.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Journal = {
  id: string;
  entry_no: number;
  entry_date: string;
  reference: string;
  description: string;
};

export default function GeneralJournalList({ slug }: { slug: string }) {
  const [data, setData] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/finance/journal?status=unposted");
      const json = await res.json();
      setData(json);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handlePost = async (id: string) => {
    if (!confirm("Post this journal?")) return;

    const res = await fetch(`/api/finance/journal/${id}/post`, {
      method: "POST",
    });

    if (res.ok) {
      const fetchData = async () => {
        const res = await fetch("/api/finance/journal?status=unposted");
        const json = await res.json();
        setData(json);
        setLoading(false);
      };
      fetchData();
    } else {
      alert("Post failed");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="p-6 rounded shadow dark:shadow-white">
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-semibold">Unposted Journals</h2>

        <Link
          href={`/${slug}/finance/general-journal/create`}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          New Journal
        </Link>
      </div>

      <table className="w-full border text-xs">
        <thead>
          <tr>
            <th className="p-2">No</th>
            <th className="p-2">Date</th>
            <th className="p-2">Reference</th>
            <th className="p-2">Description</th>
            <th className="p-2 text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((j) => (
            <tr key={j.id} className="border-t">
              <td className="p-2">{j.entry_no}</td>
              <td className="p-2">{j.entry_date}</td>
              <td className="p-2">{j.reference}</td>
              <td className="p-2">{j.description}</td>

              <td className="p-2 text-center space-x-2">
                <Link
                  href={`/${slug}/finance/general-journal/${j.id}`}
                  className="text-blue-600"
                >
                  Edit
                </Link>

                <button
                  onClick={() => handlePost(j.id)}
                  className="text-green-600"
                >
                  Post
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
