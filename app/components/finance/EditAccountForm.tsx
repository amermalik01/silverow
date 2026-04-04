// app/components/finance/EditAccountForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  parent_id?: string | null;
  vat_rate_id?: string | null;
  is_summary: boolean;
};

type VatRate = {
  id: string;
  name: string;
  rate: number;
};

type Props = {
  slug: string;
  id: string;
};

export default function EditAccountForm({ slug, id }: Props) {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vatRates, setVatRates] = useState<VatRate[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    code: "",
    name: "",
    account_type: "ASSET",
    parent_id: "",
    vat_rate_id: "",
    is_summary: false,
  });

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accRes, vatRes, currentRes] = await Promise.all([
          fetch("/api/finance/accounts"),
          fetch("/api/setup/vat-rates"),
          fetch(`/api/finance/accounts/${id}`),
        ]);

        const accData = await accRes.json();
        const vatData = await vatRes.json();
        const current = await currentRes.json();

        setAccounts(accData);
        setVatRates(vatData);

        // setForm({
        //   code: current.code,
        //   name: current.name,
        //   account_type: current.account_type,
        //   parent_id: current.parent_id || "",
        //   vat_rate_id: current.vat_rate_id || "",
        //   is_summary: current.is_summary,
        // });

        setForm({
          code: current.code || "",
          name: current.name || "",
          account_type: current.account_type || "ASSET",
          parent_id: current.parent_id || "",
          vat_rate_id: current.vat_rate_id || "",
          is_summary: current.is_summary ?? false,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  /* ---------------- CHANGE ---------------- */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;

      setForm({
        ...form,
        [name]: checked,
        vat_rate_id: checked ? "" : form.vat_rate_id, // clear VAT if summary
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

    try {
      const res = await fetch(`/api/finance/accounts/${id}`, {
        method: "PUT",
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
        const err = await res.json();
        alert(err.error || "Update failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating account");
    }
  };

  if (loading) return <p>Loading...</p>;

  /* ---------------- UI ---------------- */

  return (
    <form
      onSubmit={handleSubmit}
      className=" p-6 rounded shadow dark:shadow-white space-y-4 max-w-xl"
    >
      {/* Code */}
      <input
        name="code"
        value={form.code}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      {/* Name */}
      <input
        name="name"
        value={form.name}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      {/* Type */}
      <select
        name="account_type"
        value={form.account_type || ""}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      >
        <option value="ASSET">Asset</option>
        <option value="LIABILITY">Liability</option>
        <option value="EQUITY">Equity</option>
        <option value="REVENUE">Revenue</option>
        <option value="EXPENSE">Expense</option>
      </select>

      {/* Parent */}
      <select
        name="parent_id"
        value={form.parent_id || ""}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      >
        <option value="">None</option>

        {accounts
          .filter((a) => a.is_summary && a.id !== id)
          .map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name}
            </option>
          ))}
      </select>

      {/* VAT */}
      <select
        name="vat_rate_id"
        value={form.vat_rate_id || ""}
        onChange={handleChange}
        disabled={form.is_summary}
        className="w-full border p-2 rounded"
      >
        <option value="">None</option>

        {vatRates.map((vat) => (
          <option key={vat.id} value={vat.id}>
            {vat.name} ({vat.rate}%)
          </option>
        ))}
      </select>

      {/* Summary */}
      <label className="flex gap-2">
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

/* "use client";

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
      className=" p-6 rounded shadow dark:shadow-white space-y-4"
    >

      <div>
        <label className="block text-sm font-medium">Code</label>
        <input
          name="code"
          value={form.code}
          onChange={handleChange}
          className="border p-2 rounded w-full"
        />
      </div>



      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="border p-2 rounded w-full"
        />
      </div>



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
 */
