// app/components/inventory/items/ItemTabs.tsx

"use client";

import { useEffect, useState } from "react";

import ItemForm from "./ItemForm";
import InventoryTab from "./tabs/InventoryTab";
import SalesTab from "./tabs/SalesTab";
import PurchaseTab from "./tabs/PurchaseTab";
import WarehouseTab from "./tabs/WarehouseTab";
import UOMTab from "./tabs/UOMTab";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
};

type ItemResponse = {
  id: string;
  item_code: string;
  name: string;
};

type TabKey =
  | "general"
  | "inventory"
  | "sales"
  | "purchase"
  | "uoms"
  | "warehouses"
  | "accounting"
  | "attributes";

const tabs: {
  key: TabKey;
  label: string;
}[] = [
  {
    key: "general",
    label: "General",
  },

  {
    key: "inventory",
    label: "Inventory",
  },

  {
    key: "sales",
    label: "Sales",
  },

  {
    key: "purchase",
    label: "Purchase",
  },

  {
    key: "uoms",
    label: "UOMs",
  },

  {
    key: "warehouses",
    label: "Warehouses",
  },

  {
    key: "accounting",
    label: "Accounting",
  },

  {
    key: "attributes",
    label: "Attributes",
  },
];

export default function ItemTabs({ id }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  const [item, setItem] = useState<ItemResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/inventory/items/${id}`);

      if (!res.ok) {
        throw new Error("Failed to load item");
      }

      const result: ItemResponse = await res.json();

      setItem(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!item) {
    return <div>Item not found</div>;
  }

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{item.name}</h1>

            <p className="text-gray-500">{item.item_code}</p>
          </div>
        </div>
      </div>

      {/* TAB HEADER */}
      <div className="border rounded  overflow-auto">
        <div className="flex min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 border-r text-xs font-medium text-black
              ${activeTab === tab.key ? "bg-blue-600 text-white" : "bg-white"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="border rounded  p-6">
        {activeTab === "general" && <ItemForm id={id} />}

        {activeTab === "inventory" && <InventoryTab itemId={id} />}

        {/* {activeTab === "sales" && <SalesTab itemId={id} />}

        {activeTab === "purchase" && <PurchaseTab itemId={id} />} */}

        {activeTab === "uoms" && <UOMTab itemId={id} />}

        {/* {activeTab === "warehouses" && <WarehouseTab itemId={id} />} */}

        {activeTab === "accounting" && <AccountingTab itemId={id} />}

        {activeTab === "attributes" && <AttributeTab itemId={id} />}
      </div>
    </div>
  );
}




/* =========================
   ACCOUNTING TAB
========================= */

function AccountingTab({ itemId }: { itemId: string }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">GL Accounts</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-4">Inventory GL</div>

        <div className="border rounded p-4">COGS GL</div>

        <div className="border rounded p-4">Sales GL</div>

        <div className="border rounded p-4">Purchase GL</div>
      </div>

      <p className="text-xs text-gray-500">Item ID: {itemId}</p>
    </div>
  );
}

/* =========================
   ATTRIBUTE TAB
========================= */

function AttributeTab({ itemId }: { itemId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dynamic Attributes</h2>

        <Button
          type="button"
          // className="bg-blue-600 text-white px-4 py-2 rounded"
          variant="add_line"
        >
          + Add Attribute
        </Button>
      </div>

      <div className="border rounded overflow-auto">
        <table className="w-full table-fixed text-xs">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="p-3 text-left">Attribute</th>

              <th className="p-3 text-left">Value</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td colSpan={2} className="p-4 text-center text-gray-500">
                No attributes found
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">Item ID: {itemId}</p>
    </div>
  );
}
