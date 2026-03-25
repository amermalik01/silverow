// app/components/finance/PostedCustomerJournalList.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CustomerJournalListItem } from "@/types/finance";

export default function PostedCustomerJournalList({ slug }: { slug: string }) {
  const [data, setData] = useState<CustomerJournalListItem[]>([]);

  useEffect(() => {
    fetch("/api/finance/customer-journal?status=posted")
      .then((r) => r.json())
      .then((json: CustomerJournalListItem[]) => {
        setData(json);
      });
  }, []);

  return (
    <table className="w-full border">
      <tbody>
        {data.map((j) => (
          <tr key={j.id}>
            <td>
              <Link href={`/${slug}/finance/posted-customer-journal/${j.id}`}>
                {j.entry_no}
              </Link>
            </td>
            <td>{j.entry_date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
