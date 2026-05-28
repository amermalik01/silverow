// app/components/setup/posting/InventoryPostingGroups.tsx

"use client";

import { useEffect, useState } from "react";
import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

export default function InventoryPostingGroupsPage() {
  const [accountOptions, setAccountOptions] = useState([]);
  const [isPerpetual, setIsPerpetual] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/setup/finance/accounts/options").then((r) => r.json()),
      fetch("/api/setup/posting/inventory-system").then((r) => r.json())
    ]).then(([accounts, systemStatus]) => {
      setAccountOptions(accounts);
      setIsPerpetual(systemStatus?.inventory_system === "PERPETUAL");
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading configurations...</div>;

  return (
    <SetupDataGrid
      title="Inventory Posting Groups Matrix"
      api="/api/setup/posting/inventory-groups"
      fields={[
        { name: "name", label: "Group Name", required: true },
        { name: "inventory_account_id", label: "Asset Account (Balance Sheet)", type: "select", options: accountOptions, required: isPerpetual },
        { name: "cogs_account_id", label: "COGS Account (Income Statement)", type: "select", options: accountOptions, required: isPerpetual },
        { name: "adjustment_account_id", label: "Inventory Adjustment Account", type: "select", options: accountOptions },
      ]}
      columns={[
        { name: "name", label: "Name", sortable: true },
        { name: "inventory_account", label: "Inventory Asset Account" },
        { name: "cogs_account", label: "COGS Account" },
        { name: "adjustment_account", label: "Adjustment Account" },
      ]}
    />
  );
}

/* "use client";

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";

export default function InventoryPostingGroupsPage() {
  return (
    <SetupDataGrid
      title="Inventory Posting Groups"
      api="/api/setup/posting/inventory-groups"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "inventory_account_id", label: "Inventory Account", type: "select", required: true },
        { name: "cogs_account_id", label: "COGS Account", type: "select", required: true },
        { name: "adjustment_account_id", label: "Adjustment Account", type: "select" },
      ]}
      columns={[
        { name: "name", label: "Name", sortable: true },
        { name: "inventory_account_id", label: "Inventory" },
        { name: "cogs_account_id", label: "COGS" },
        { name: "adjustment_account_id", label: "Adjustment" },
      ]}
    />
  );
} */
/* "use client";

import { useEffect, useState } from "react";
import SetupCrud from "../SetupCrud";

export default function InventoryPostingGroups(){

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
      title="Inventory Posting Groups"
      api="/api/setup/posting/inventory-groups"
      fields={[
        { name:"name", label:"Name" },
        { name:"inventory_account_id", label:"Inventory", type:"select", options },
        { name:"cogs_account_id", label:"COGS", type:"select", options },
        { name:"adjustment_account_id", label:"Adjustment", type:"select", options },
      ]}
      columns={[
        { name:"name", label:"Name" }
      ]}
    />
  );
} */

/* "use client";

import { useEffect, useState } from "react";

type InventoryPostingGroup = {
  id: string
  name: string
}

export default function InventoryPostingGroups() {
  const [groups, setGroups] = useState<InventoryPostingGroup[]>([])

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/setup/posting/inventory-groups");
      setGroups(await res.json());
    };
    load();
  }, []);

  const remove = async (id: string) => {
    await fetch(`/api/setup/posting/inventory-groups/${id}`, {
      method: "DELETE",
    });

    const res = await fetch("/api/setup/posting/inventory-groups");
    setGroups(await res.json());
  };

  return (
    <div className="border p-6 rounded space-y-4">
      <h2 className="font-semibold text-lg">Inventory Posting Groups</h2>

      <table className="w-full border text-sm">
        <tbody>
          {groups.map((g) => (
            <tr key={g.id}>
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
} */
