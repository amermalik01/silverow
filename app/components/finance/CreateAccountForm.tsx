// app/components/finance/CreateAccountForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Account, PostingGroup, VatRate } from "@/types/finance";

/* ---------------- TYPES ---------------- */

type FormState = {
  code: string;
  name: string;
  account_type: string;
  parent_id: string;
  vat_rate_id: string;
  is_summary: boolean;
};

type Props = {
  slug: string;
};

/* ---------------- COMPONENT ---------------- */

export default function CreateAccountForm({ slug }: Props) {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vatRates, setVatRates] = useState<VatRate[]>([]);

  const [form, setForm] = useState<FormState>({
    code: "",
    name: "",
    account_type: "ASSET",
    parent_id: "",
    vat_rate_id: "",
    is_summary: false,
  });

  const is_posting = !form.is_summary;

  const [loading, setLoading] = useState(false);

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accountsRes, vatRes] = await Promise.all([
          fetch("/api/finance/accounts"),
          fetch("/api/setup/vat-rates"),
        ]);

        const accountsData: Account[] = await accountsRes.json();
        const vatData: VatRate[] = await vatRes.json();

        setAccounts(accountsData);
        setVatRates(vatData);
      } catch (error) {
        console.error("Failed to load form data", error);
      }
    };

    loadData();
  }, []);

  /* ---------------- FORM CHANGE ---------------- */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;

      setForm({
        ...form,
        [name]: checked,
        vat_rate_id: checked ? "" : form.vat_rate_id,
      });

      return;
    }

    setForm({
      ...form,
      [name]: value,
    });
  };

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await fetch("/api/finance/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          is_posting: !form.is_summary,
        }),
      });

      if (res.ok) {
        router.push(`/${slug}/finance/chart-of-accounts`);
      } else {
        alert("Failed to create account");
      }
    } catch (error) {
      console.error("Create account failed", error);
      alert("Error creating account");
    }

    setLoading(false);
  };

  /* ---------------- UI ---------------- */

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 rounded shadow dark:shadow-white space-y-4 max-w-xl"
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

      {/* Parent */}

      <div>
        <label className="block text-sm font-medium">Parent Account</label>

        <select
          name="parent_id"
          value={form.parent_id}
          onChange={handleChange}
          className="w-full border p-2 rounded mt-1"
        >
          <option value="">None</option>
          {accounts
            .filter((acc) => acc.is_summary) // only allow summary as parent
            .map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.code} - {acc.name}
              </option>
            ))}

          {/* {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.code} - {acc.name}
            </option>
          ))} */}
        </select>
      </div>

      {/* VAT Rate */}

      <div>
        <label className="block text-sm font-medium">VAT Rate</label>

        <select
          name="vat_rate_id"
          value={form.vat_rate_id}
          onChange={handleChange}
          disabled={form.is_summary}
          className="w-full border p-2 rounded mt-1"
        >
          <option value="">None</option>

          {vatRates.map((vat) => (
            <option key={vat.id} value={vat.id}>
              {vat.name} ({vat.rate}%)
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="is_summary"
          checked={form.is_summary}
          onChange={handleChange}
        />
        Summary Account
      </label>

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
