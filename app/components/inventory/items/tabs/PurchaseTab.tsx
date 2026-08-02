// app/components/inventory/items/tabs/PurchaseTab.tsx

"use client";

import { ItemFormData, ItemLookupOption } from "@/types/inventory";

type Props = {
  item: ItemFormData;
  setItem: React.Dispatch<React.SetStateAction<ItemFormData>>;
  uoms: ItemLookupOption[];
  isReadonly?: boolean;
};

export default function PurchaseTab({
  item,
  setItem,
  uoms,
  isReadonly = false,
}: Props) {
  return (
    <div className="space-y-6 text-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">
            Costing Method
          </label>
          <select
            disabled={isReadonly}
            value={item.costing_method}
            onChange={(e) =>
              setItem((prev) => ({
                ...prev,
                costing_method: Number(e.target.value),
              }))
            }
            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
          >
            <option value={1}>First in First Out (FIFO)</option>
            <option value={2}>Weighted Average</option>
            <option value={3}>Standard Costing</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium text-slate-700 dark:text-slate-300">
            Standard Cost
          </label>
          <input
            type="number"
            disabled={isReadonly}
            value={item.standard_cost}
            onChange={(e) =>
              setItem((prev) => ({ ...prev, standard_cost: e.target.value }))
            }
            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
          />
        </div>
      </div>

      {/* Grid view modeled after Legacy Purchase Information Grid */}
      <div>
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Purchase Pricing Configuration
        </h3>
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">U.O.M</th>
                <th className="p-3">Purchase Price</th>
                <th className="p-3">Min Order Qty</th>
                <th className="p-3">Max Order Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border-t border-slate-100 dark:border-slate-800/40">
                  <select
                    disabled={isReadonly}
                    value={item.purchase_uom_id}
                    onChange={(e) =>
                      setItem((prev) => ({
                        ...prev,
                        purchase_uom_id: e.target.value,
                      }))
                    }
                    className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full"
                  >
                    <option value="">Default Base UOM</option>
                    {uoms.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3 border-t border-slate-100 dark:border-slate-800/40">
                  <input
                    type="number"
                    disabled={isReadonly}
                    value={item.standard_cost}
                    onChange={(e) =>
                      setItem((prev) => ({
                        ...prev,
                        standard_cost: e.target.value,
                      }))
                    }
                    className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full"
                  />
                </td>
                <td className="p-3 border-t border-slate-100 dark:border-slate-800/40">
                  <input
                    type="number"
                    disabled={isReadonly}
                    defaultValue={1}
                    className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full"
                  />
                </td>
                <td className="p-3 border-t border-slate-100 dark:border-slate-800/40">
                  <input
                    type="number"
                    disabled={isReadonly}
                    defaultValue={0}
                    className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";

type PurchasePrice = {
  id: string;
  uom_id: string;
  uom_name?: string | null;
  price: number;
  vendor_id?: string | null;
  vendor_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

type Props = {
  itemId: string;
};

export default function PurchaseTab({ itemId }: Props) {
  const [data, setData] = useState<PurchasePrice[]>([]);

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [itemId]);

  const loadData = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/inventory/items/${itemId}/purchase-prices`);

      const result = await res.json();

      setData(result || []);
    } catch (err) {
      console.error("PurchaseTab error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
 

      <div>
        <h2 className="text-lg font-semibold">Purchase Setup</h2>

        <p className="text-xs text-gray-500">
          Manage item purchase cost by UOM and vendor
        </p>
      </div>

 

      <div className="border rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="p-3 text-left">UOM</th>
              <th className="p-3 text-left">Cost</th>
              <th className="p-3 text-left">Vendor</th>
              <th className="p-3 text-left">Start Date</th>
              <th className="p-3 text-left">End Date</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No purchase prices found
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">{row.uom_name || row.uom_id}</td>

                  <td className="p-3">{row.price}</td>

                  <td className="p-3">
                    {row.vendor_name || row.vendor_id || "-"}
                  </td>

                  <td className="p-3">{row.start_date ?? "-"}</td>

                  <td className="p-3">{row.end_date ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

 

      <p className="text-xs text-gray-500">Item ID: {itemId}</p>
    </div>
  );
} */
