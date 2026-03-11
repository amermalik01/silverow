// app/components/finance/CreateAccountForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  name: string;
  code: string;
};

export default function CreateAccountForm({ slug }: { slug: string }) {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);

  const [form, setForm] = useState({
    code: "",
    name: "",
    account_type: "ASSET",
    parent_id: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadParents = async () => {
      try {
        const res = await fetch("/api/finance/accounts");
        const data = await res.json();
        setAccounts(data);
      } catch (error) {
        console.error("Failed to load accounts", error);
      }
    };

    loadParents();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    const res = await fetch("/api/finance/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (res.ok) {
      router.push(`/${slug}/finance/chart-of-accounts`);
    } else {
      alert("Failed to create account");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded shadow space-y-4 max-w-xl"
    >
      {/* Code */}

      <div>
        <label className="block text-sm font-medium">Account Code</label>

        <input
          type="text"
          name="code"
          required
          value={form.code}
          onChange={handleChange}
          className="w-full border p-2 rounded mt-1"
        />
      </div>

      {/* Name */}

      <div>
        <label className="block text-sm font-medium">Account Name</label>

        <input
          type="text"
          name="name"
          required
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 rounded mt-1"
        />
      </div>

      {/* Account Type */}

      <div>
        <label className="block text-sm font-medium">Account Type</label>

        <select
          name="account_type"
          value={form.account_type}
          onChange={handleChange}
          className="w-full border p-2 rounded mt-1"
        >
          <option value="ASSET">Asset</option>
          <option value="LIABILITY">Liability</option>
          <option value="EQUITY">Equity</option>
          <option value="REVENUE">Revenue</option>
          <option value="EXPENSE">Expense</option>
        </select>
      </div>

      {/* Parent Account */}

      <div>
        <label className="block text-sm font-medium">Parent Account</label>

        <select
          name="parent_id"
          value={form.parent_id}
          onChange={handleChange}
          className="w-full border p-2 rounded mt-1"
        >
          <option value="">None</option>

          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.code} - {acc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Submit */}

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Saving..." : "Create Account"}
      </button>
    </form>
  );
}
