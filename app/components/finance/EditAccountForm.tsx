// app/components/finance/EditAccountForm.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Account, ParentAccount, VatRate } from "@/types/finance";

type PostingGroup = {
  id: string;
  name: string;
};

type Props = {
  slug: string;
  account: Account;
  parents: ParentAccount[];
  vatRates: VatRate[];
  postingGroups: PostingGroup[];
};

export default function EditAccountForm({
  slug,
  account,
  parents,
  vatRates,
  postingGroups,
}: Props) {
  const router = useRouter();

  const [form, setForm] = useState<Account>(account);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;

      setForm({
        ...form,
        [name]: checked,
      });

      return;
    }

    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await fetch(`/api/finance/accounts/${account.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    router.push(`/${slug}/finance/chart-of-accounts`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded shadow space-y-4"
    >
      {/* Code */}

      <div>
        <label className="block text-sm font-medium">Code</label>
        <input
          name="code"
          value={form.code}
          onChange={handleChange}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Name */}

      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Parent */}

      <div>
        <label className="block text-sm font-medium">Parent Account</label>

        <select
          name="parent_id"
          value={form.parent_id || ""}
          onChange={handleChange}
          className="border p-2 rounded w-full"
        >
          <option value="">None</option>

          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} - {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* VAT */}

      <div>
        <label className="block text-sm font-medium">VAT Rate</label>

        <select
          name="vat_rate_id"
          value={form.vat_rate_id || ""}
          onChange={handleChange}
          className="border p-2 rounded w-full"
        >
          <option value="">None</option>

          {vatRates.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.rate}%)
            </option>
          ))}
        </select>
      </div>

      {/* Posting Group */}

      <div>
        <label className="block text-sm font-medium">Posting Group</label>

        <select
          name="posting_group_id"
          value={form.posting_group_id || ""}
          onChange={handleChange}
          className="border p-2 rounded w-full"
        >
          <option value="">None</option>

          {postingGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
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

      <button className="bg-blue-600 text-white px-4 py-2 rounded">
        Update Account
      </button>
    </form>
  );
}
