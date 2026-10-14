// app/components/inventory/items/tabs/PurchaseTab.tsx

"use client";

import NumericTextInput from "@/components/ui/NumericTextInput";
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-2">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Costing Method
            </label>
            <div className="col-span-2">
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
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Standard Cost
            </label>
            <div className="col-span-2">
              <NumericTextInput
                allowDecimals
                decimalScale={2}
                disabled={isReadonly}
                value={Number(item.standard_cost)}
                onChange={(val) =>
                  setItem((prev) => ({ ...prev, standard_cost: String(val) }))
                }
                className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid view modeled after Legacy Purchase Information Grid */}
      <div>
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Purchase Pricing Configuration
        </h3>
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full table-fixed text-left">
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

                  <NumericTextInput
                    allowDecimals
                    decimalScale={2}
                    disabled={isReadonly}
                    value={Number(item.standard_cost)}
                    onChange={(val) =>
                      setItem((prev) => ({
                        ...prev,
                        standard_cost: String(val),
                      }))
                    }
                    className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="p-3 border-t border-slate-100 dark:border-slate-800/40">
                  <input
                    type="number"
                    disabled={isReadonly}
                    defaultValue={1}
                    className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="p-3 border-t border-slate-100 dark:border-slate-800/40">
                  <input
                    type="number"
                    disabled={isReadonly}
                    defaultValue={0}
                    className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full disabled:bg-slate-50 disabled:cursor-not-allowed"
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
