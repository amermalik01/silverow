// app/components/setup/VatPostingSetupList.tsx
// app/company/setup/finance/VATPostingSetupPage.tsx
"use client";

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

export default function VATPostingSetupPage() {
  return (
    <SetupDataGrid
      title="VAT Posting Setup"
      api="/api/setup/vat-posting-setup"
      fields={[
        { name: "business_group", label: "Posting Group", type: "select", required: true },
        { name: "product_group", label: "VAT Name", type: "select", required: true },
        { name: "vat_value", label: "VAT Value", type: "number", required: true },
        { name: "vat_posting_group", label: "VAT Posting Group", required: true },
        { name: "vat_rate", label: "VAT Rate", type: "number", required: true },
      ]}
      columns={[
        { name: "business_group", label: "Posting Group", sortable: true },
        { name: "product_group", label: "VAT Name" },
        { name: "vat_value", label: "VAT Value" },
        { name: "vat_posting_group", label: "VAT Posting Group" },
        { name: "vat_rate", label: "VAT Rate" },
      ]}
    />
  );
}

/* "use client";

import { useEffect, useState } from "react";

type BusinessGroup = { id: string; name: string };
type ProductGroup = { id: string; name: string };
type Account = { id: string; code: string; name: string };

type VatRow = {
  id: string;
  vat_rate: number;
  business_group: string;
  product_group: string;
};

export default function VatPostingSetupList() {
  const [rows, setRows] = useState<VatRow[]>([]);
  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [form, setForm] = useState({
    vat_business_group_id: "",
    vat_product_group_id: "",
    vat_rate: "",
    sales_vat_account_id: "",
    purchase_vat_account_id: "",
  });

  useEffect(() => {
    const loadData = async () => {
      const [setup, bg, pg, acc] = await Promise.all([
        fetch("/api/setup/vat-posting-setup").then((r) => r.json()),
        fetch("/api/setup/vat-business-posting-groups").then((r) => r.json()),
        fetch("/api/setup/vat-product-posting-groups").then((r) => r.json()),
        fetch("/api/finance/accounts").then((r) => r.json()),
      ]);

      setRows(setup);
      setBusinessGroups(bg);
      setProductGroups(pg);
      setAccounts(acc);
    };

    loadData();
  }, []);

  const createRow = async () => {
    await fetch("/api/setup/vat-posting-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm({
      vat_business_group_id: "",
      vat_product_group_id: "",
      vat_rate: "",
      sales_vat_account_id: "",
      purchase_vat_account_id: "",
    });

    const [setup, bg, pg, acc] = await Promise.all([
      fetch("/api/setup/vat-posting-setup").then((r) => r.json()),
      fetch("/api/setup/vat-business-posting-groups").then((r) => r.json()),
      fetch("/api/setup/vat-product-posting-groups").then((r) => r.json()),
      fetch("/api/finance/accounts").then((r) => r.json()),
    ]);

    setRows(setup);
    setBusinessGroups(bg);
    setProductGroups(pg);
    setAccounts(acc);
  };

  const deleteRow = async (id: string) => {
    if (!confirm("Delete setup?")) return;

    await fetch(`/api/setup/vat-posting-setup/${id}`, { method: "DELETE" });

    const [setup, bg, pg, acc] = await Promise.all([
      fetch("/api/setup/vat-posting-setup").then((r) => r.json()),
      fetch("/api/setup/vat-business-posting-groups").then((r) => r.json()),
      fetch("/api/setup/vat-product-posting-groups").then((r) => r.json()),
      fetch("/api/finance/accounts").then((r) => r.json()),
    ]);

    setRows(setup);
    setBusinessGroups(bg);
    setProductGroups(pg);
    setAccounts(acc);
  };

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-5 gap-3">
        <select
          value={form.vat_business_group_id}
          onChange={(e) =>
            setForm({ ...form, vat_business_group_id: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="">Business Group</option>
          {businessGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <select
          value={form.vat_product_group_id}
          onChange={(e) =>
            setForm({ ...form, vat_product_group_id: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="">Product Group</option>
          {productGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <input
          placeholder="VAT %"
          value={form.vat_rate}
          onChange={(e) => setForm({ ...form, vat_rate: e.target.value })}
          className="border p-2 rounded"
        />

        <select
          value={form.sales_vat_account_id}
          onChange={(e) =>
            setForm({ ...form, sales_vat_account_id: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="">Sales VAT Account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name}
            </option>
          ))}
        </select>

        <select
          value={form.purchase_vat_account_id}
          onChange={(e) =>
            setForm({ ...form, purchase_vat_account_id: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="">Purchase VAT Account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={createRow}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add Setup
      </button>

   

      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th className="p-2">Business Group</th>
            <th className="p-2">Product Group</th>
            <th className="p-2">VAT %</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.business_group}</td>
              <td className="p-2">{r.product_group}</td>
              <td className="p-2">{r.vat_rate}%</td>

              <td className="p-2">
                <button
                  className="text-red-600"
                  onClick={() => deleteRow(r.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} */
