// app/components/finance/PostedCustomerJournalView.tsx
"use client";

import { CustomerJournal } from "@/types/finance";
import { useEffect, useState } from "react";

export default function PostedCustomerJournalView({ id }: { id: string }) {
  const [data, setData] = useState<CustomerJournal | null>(null);

  useEffect(() => {
    fetch(`/api/finance/customer-journal/${id}`)
      .then((r) => r.json())
      .then((json: CustomerJournal) => {
        setData(json);
      });
  }, [id]);

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h2>Journal #{data.entry_no}</h2>

      <table className="w-full table-fixed border">
        <tbody>
          {data.lines.map((l) => (
            <tr key={l.id}>
              <td>{l.account_name}</td>
              <td>{l.debit}</td>
              <td>{l.credit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
