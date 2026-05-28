// app/components/setup/posting/SalesPostingGroups.tsx

"use client";

import { useEffect, useState } from "react";
import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

export default function SalesPostingGroupsPage() {
  const [accountOptions, setAccountOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/setup/finance/accounts/options")
      .then((r) => r.json())
      .then((data) => setAccountOptions(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading configurations...</div>;

  return (
    <SetupDataGrid
      title="Sales Posting Groups"
      api="/api/setup/posting/sales-groups"
      fields={[
        { name: "name", label: "Group Name", required: true },
        { name: "receivable_account_id", label: "Receivable Account", type: "select", options: accountOptions, required: true },
        { name: "sales_account_id", label: "Sales Account", type: "select", options: accountOptions, required: true },
        { name: "discount_account_id", label: "Discount Account", type: "select", options: accountOptions },
        { name: "vat_account_id", label: "VAT Account", type: "select", options: accountOptions },
      ]}
      columns={[
        { name: "name", label: "Name", sortable: true },
        { name: "receivable_account", label: "Receivable Account" },
        { name: "sales_account", label: "Sales Account" },
        { name: "discount_account", label: "Discount Account" },
        { name: "vat_account", label: "VAT Account" },
      ]}
    />
  );
}

/* "use client";

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

export default function SalesPostingGroupsPage() {
  return (
    <SetupDataGrid
      title="Sales Posting Groups"
      api="/api/setup/posting/sales-groups"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "receivable_account_id", label: "Receivable Account", type: "select", required: true },
        { name: "sales_account_id", label: "Sales Account", type: "select", required: true },
        { name: "discount_account_id", label: "Discount Account", type: "select" },
        { name: "vat_account_id", label: "VAT Account", type: "select" },
      ]}
      columns={[
        { name: "name", label: "Name", sortable: true },
        { name: "receivable_account_id", label: "Receivable" },
        { name: "sales_account_id", label: "Sales" },
        { name: "discount_account_id", label: "Discount" },
        { name: "vat_account_id", label: "VAT" },
      ]}
    />
  );
} */

/* "use client";

import { useEffect, useState } from "react";
import SetupCrud from "../SetupCrud";

export default function SalesPostingGroups() {

  const [accounts,setAccounts] = useState([]);

  useEffect(()=>{
    fetch("/api/finance/accounts")
      .then(r=>r.json())
      .then(setAccounts);
  },[]);

  const accountOptions = accounts.map((a:any)=>({
    value:a.id,
    label:`${a.code} - ${a.name}`
  }));

  return (
    <SetupCrud
      title="Sales Posting Groups"
      api="/api/setup/posting/sales-groups"
      fields={[
        { name:"name", label:"Name" },
        { name:"receivable_account_id", label:"Receivable", type:"select", options:accountOptions },
        { name:"sales_account_id", label:"Sales", type:"select", options:accountOptions },
        { name:"discount_account_id", label:"Discount", type:"select", options:accountOptions },
        { name:"vat_account_id", label:"VAT", type:"select", options:accountOptions },
      ]}
      columns={[
        { name:"name", label:"Name" }
      ]}
    />
  );
} */
/* "use client";

import { useEffect, useState } from "react";

type Group = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  code: string;
  name: string;
};

export default function SalesPostingGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [form, setForm] = useState({
    name: "",
    receivable_account_id: "",
    sales_account_id: "",
    discount_account_id: "",
    vat_account_id: "",
  });

  useEffect(() => {
    const load = async () => {
      const [g, a] = await Promise.all([
        fetch("/api/setup/posting/sales-groups").then((r) => r.json()),
        fetch("/api/finance/accounts").then((r) => r.json()),
      ]);

      setGroups(g);
      setAccounts(a);
    };

    load();
  }, []);

  const create = async () => {
    await fetch("/api/setup/posting/sales-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm({
      name: "",
      receivable_account_id: "",
      sales_account_id: "",
      discount_account_id: "",
      vat_account_id: "",
    });

    const [g, a] = await Promise.all([
      fetch("/api/setup/posting/sales-groups").then((r) => r.json()),
      fetch("/api/finance/accounts").then((r) => r.json()),
    ]);

    setGroups(g);
    setAccounts(a);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete group?")) return;

    await fetch(`/api/setup/posting/sales-groups/${id}`, {
      method: "DELETE",
    });

    const [g, a] = await Promise.all([
      fetch("/api/setup/posting/sales-groups").then((r) => r.json()),
      fetch("/api/finance/accounts").then((r) => r.json()),
    ]);

    setGroups(g);
    setAccounts(a);
  };

  return (
    <div className="border p-6 rounded space-y-4">
      <h2 className="font-semibold text-lg">Sales Posting Groups</h2>

      <div className="grid grid-cols-5 gap-3">
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border p-2 rounded"
        />

        <select
          value={form.receivable_account_id}
          onChange={(e) =>
            setForm({ ...form, receivable_account_id: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option>Receivable</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name}
            </option>
          ))}
        </select>

        <select
          value={form.sales_account_id}
          onChange={(e) =>
            setForm({ ...form, sales_account_id: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option>Sales</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name}
            </option>
          ))}
        </select>

        <select
          value={form.discount_account_id}
          onChange={(e) =>
            setForm({ ...form, discount_account_id: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option>Discount</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name}
            </option>
          ))}
        </select>

        <select
          value={form.vat_account_id}
          onChange={(e) => setForm({ ...form, vat_account_id: e.target.value })}
          className="border p-2 rounded"
        >
          <option>VAT</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={create}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add
      </button>

      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th className="p-2">Name</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {groups.map((g) => (
            <tr key={g.id} className="border-t">
              <td className="p-2">{g.name}</td>
              <td>
                <button onClick={() => remove(g.id)} className="text-red-600">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
 */