// app/components/setup/posting/PurchasePostingGroups.tsx

"use client";

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

export default function PurchasePostingGroupsPage() {
  return (
    <SetupDataGrid
      title="Purchase Posting Groups"
      api="/api/setup/posting/purchase-groups"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "payable_account_id", label: "Payable Account", type: "select", required: true },
        { name: "purchase_account_id", label: "Purchase Account", type: "select", required: true },
        { name: "discount_account_id", label: "Discount Account", type: "select" },
        { name: "vat_account_id", label: "VAT Account", type: "select" },
        { name: "inventory_account_id", label: "Inventory Account", type: "select" },
      ]}
      columns={[
        { name: "name", label: "Name", sortable: true },
        { name: "payable_account_id", label: "Payable" },
        { name: "purchase_account_id", label: "Purchase" },
        { name: "discount_account_id", label: "Discount" },
        { name: "vat_account_id", label: "VAT" },
        { name: "inventory_account_id", label: "Inventory" },
      ]}
    />
  );
}
/* "use client";

import { useEffect, useState } from "react";
import SetupCrud from "../SetupCrud";

export default function PurchasePostingGroups(){

  const [accounts,setAccounts] = useState([]);

  useEffect(()=>{
    fetch("/api/finance/accounts")
      .then(r=>r.json())
      .then(setAccounts);
  },[]);

  const options = accounts.map((a:any)=>({
    value:a.id,
    label:`${a.code} - ${a.name}`
  }));

  return (
    <SetupCrud
      title="Purchase Posting Groups"
      api="/api/setup/posting/purchase-groups"
      fields={[
        { name:"name", label:"Name" },
        { name:"payable_account_id", label:"Payable", type:"select", options },
        { name:"purchase_account_id", label:"Purchase", type:"select", options },
        { name:"discount_account_id", label:"Discount", type:"select", options },
        { name:"vat_account_id", label:"VAT", type:"select", options },
        { name:"inventory_account_id", label:"Inventory", type:"select", options },
      ]}
      columns={[
        { name:"name", label:"Name" }
      ]}
    />
  );
} */
/* "use client";

import { useEffect, useState } from "react";

type PurchasePostingGroup = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  code: string;
  name: string;
};

export default function PurchasePostingGroups() {

  const [groups, setGroups] = useState<PurchasePostingGroup[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [form, setForm] = useState({
    name: "",
    payable_account_id: "",
    purchase_account_id: "",
    discount_account_id: "",
    vat_account_id: "",
    inventory_account_id: "",
  });

  const load = async () => {
    const [g, a] = await Promise.all([
      fetch("/api/setup/posting/purchase-groups").then((r) => r.json()),
      fetch("/api/finance/accounts").then((r) => r.json()),
    ]);

    setGroups(g);
    setAccounts(a);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.name) return;

    await fetch("/api/setup/posting/purchase-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm({
      name: "",
      payable_account_id: "",
      purchase_account_id: "",
      discount_account_id: "",
      vat_account_id: "",
      inventory_account_id: "",
    });

    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete group?")) return;

    await fetch(`/api/setup/posting/purchase-groups/${id}`, {
      method: "DELETE",
    });

    load();
  };

  return (
    <div className="border p-6 rounded space-y-4">

      <h2 className="font-semibold text-lg">
        Purchase Posting Groups
      </h2>

      <div className="grid grid-cols-3 gap-3">

        <input
          placeholder="Group Name"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
          className="border p-2 rounded"
        />

        <select
          value={form.payable_account_id}
          onChange={(e) =>
            setForm({ ...form, payable_account_id: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="">Payable Account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name}
            </option>
          ))}
        </select>

        <select
          value={form.purchase_account_id}
          onChange={(e) =>
            setForm({ ...form, purchase_account_id: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="">Purchase Account</option>
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
          <option value="">Discount Account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name}
            </option>
          ))}
        </select>

        <select
          value={form.vat_account_id}
          onChange={(e) =>
            setForm({ ...form, vat_account_id: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="">VAT Account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name}
            </option>
          ))}
        </select>

        <select
          value={form.inventory_account_id}
          onChange={(e) =>
            setForm({ ...form, inventory_account_id: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="">Inventory Account</option>
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
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {groups.map((g) => (
            <tr key={g.id} className="border-t">
              <td className="p-2">{g.name}</td>

              <td className="p-2 text-center">
                <button
                  onClick={() => remove(g.id)}
                  className="text-red-600"
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
