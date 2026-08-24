// app/components/finance/CustomerJournalList.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { JournalListItem } from "@/types/finance";

export default function CustomerJournalList({ slug }: { slug: string }) {
  const [data, setData] = useState<JournalListItem[]>([]);

  useEffect(() => {
    fetch("/api/finance/customer-journal?status=unposted")
      .then((res) => res.json())
      .then(setData);
  }, []);

  const handlePost = async (id: string) => {
    if (!confirm("Post this journal?")) return;

    await fetch(`/api/finance/customer-journal/${id}/post`, {
      method: "POST",
    });

    location.reload();
  };

  return (
    <div className="p-6 rounded shadow dark:shadow-white">
      <div className="flex justify-between mb-4">
        <h2>Customer Journals</h2>

        <Link
          href={`/${slug}/finance/customer-journal/create`}
          className="bg-blue-600 text-white px-3 py-2 rounded"
        >
          New
        </Link>
      </div>

      <table className="w-full table-fixed border text-xs">
        <thead>
          <tr>
            <th>No</th>
            <th>Date</th>
            <th>Reference</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {data.map((j) => (
            <tr key={j.id}>
              <td>
                <Link
                  href={`/${slug}/finance/customer-journal/${j.id}`}
                >
                  {j.entry_no}
                </Link>
              </td>

              <td>{j.entry_date}</td>
              <td>{j.reference}</td>

              <td>
                <button onClick={() => handlePost(j.id)}>
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