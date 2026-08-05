// app/components/finance/CustomerJournalForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerJournal, CustomerJournalLine } from "@/types/finance";

type Customer = { id: string; name: string };
type Account = { id: string; code: string; name: string };

export default function CustomerJournalForm({
  slug,
  journalId,
}: {
  slug: string;
  journalId?: string;
}) {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [form, setForm] = useState({
    entry_date: "",
    customer_id: "",
    account_id: "",
    amount: "",
    type: "RECEIPT",
  });

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then(setCustomers);
    fetch("/api/finance/accounts")
      .then((r) => r.json())
      .then(setAccounts);

    if (journalId) {
      fetch(`/api/finance/customer-journal/${journalId}`)
        .then((r) => r.json())
        .then((data: CustomerJournal) => {
            
          const customerLine = data?.lines.find(
            (l: CustomerJournalLine) => l.customer_id,
          );

          const offsetLine = data?.lines.find(
            (l: CustomerJournalLine) => !l.customer_id,
          );

          setForm({
            entry_date: data?.entry_date || "",
            customer_id: customerLine?.customer_id || "",
            account_id: offsetLine?.account_id || "",
            amount: String(customerLine?.credit || customerLine?.debit || ""),
            type: customerLine?.credit ? "RECEIPT" : "PAYMENT",
          });
        });
    }
  }, [journalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const method = journalId ? "PUT" : "POST";
    const url = journalId
      ? `/api/finance/customer-journal/${journalId}`
      : `/api/finance/customer-journal`;

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    router.push(`/${slug}/finance/customer-journal`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="date"
        value={form.entry_date}
        onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
        required
      />

      <select
        value={form.customer_id}
        onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
        required
      >
        <option value="">Customer</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={form.account_id}
        onChange={(e) => setForm({ ...form, account_id: e.target.value })}
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.code} - {a.name}
          </option>
        ))}
      </select>

      <input
        type="number"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
      />

      <select
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value })}
      >
        <option value="RECEIPT">Receipt</option>
        <option value="PAYMENT">Payment</option>
      </select>

      <button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm gap-1.5 px-4 py-2">
        Save
      </button>
    </form>
  );
}
/* "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Customer = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  code: string;
  name: string;
};

export default function CustomerJournalForm({ slug }: { slug: string }) {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [form, setForm] = useState({
    entry_date: "",
    customer_id: "",
    account_id: "",
    amount: "",
    type: "RECEIPT", // or PAYMENT
  });

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then(setCustomers);
    fetch("/api/finance/accounts").then((r) => r.json()).then(setAccounts);
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    await fetch("/api/finance/customer-journal", {
      method: "POST",
      body: JSON.stringify(form),
    });

    router.push(`/${slug}/finance/customer-journal`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">



      <select
        value={form.customer_id}
        onChange={(e) =>
          setForm({ ...form, customer_id: e.target.value })
        }
        required
      >
        <option value="">Select Customer</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>



      <select
        value={form.account_id}
        onChange={(e) =>
          setForm({ ...form, account_id: e.target.value })
        }
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.code} - {a.name}
          </option>
        ))}
      </select>



      <input
        type="number"
        value={form.amount}
        onChange={(e) =>
          setForm({ ...form, amount: e.target.value })
        }
      />


      <select
        value={form.type}
        onChange={(e) =>
          setForm({ ...form, type: e.target.value })
        }
      >
        <option value="RECEIPT">Receipt</option>
        <option value="PAYMENT">Payment</option>
      </select>

      <button type="submit">Save</button>
    </form>
  );
} */
