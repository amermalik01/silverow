// app/components/finance/PostedJournalList.tsx

"use client";

import { JournalListItem } from "@/types/finance";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function PostedJournalList({ slug }: { slug: string }) {
  const [data, setData] = useState<JournalListItem[]>([]);

  useEffect(() => {
    fetch("/api/finance/journal?status=posted")
      .then((res) => res.json())
      .then(setData);
  }, []);

  return (
    <div className="p-6 rounded shadow">
      <h2 className="text-lg font-semibold mb-4">Posted Journals</h2>

      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th className="p-2">No</th>
            <th className="p-2">Date</th>
            <th className="p-2">Reference</th>
            <th className="p-2">Description</th>
          </tr>
        </thead>

        <tbody>
          {data.map((j) => (
            <tr
              key={j.id}
              className="border-t hover:bg-gray-50 cursor-pointer"
              onClick={() =>
                (window.location.href = `/${slug}/finance/posted-journal/${j.id}`)
              }
            >
              <td className="p-2">{j.entry_no}</td>
              <td className="p-2">{j.entry_date}</td>
              <td className="p-2">{j.reference}</td>
              <td className="p-2">{j.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
