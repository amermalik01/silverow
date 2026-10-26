// app/components/inventory/items/tabs/SalesTab.tsx

"use client";

import NumericTextInput from "@/components/ui/NumericTextInput";
import { ItemFormData, ItemLookupOption } from "@/types/inventory";

type Props = {
  item: ItemFormData;
  setItem: React.Dispatch<React.SetStateAction<ItemFormData>>;
  uoms: ItemLookupOption[];
  isReadonly?: boolean;
};

export default function SalesTab({
  item,
  setItem,
  uoms,
  isReadonly = false,
}: Props) {
  return (
    <div className="space-y-4 text-xs">
      <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Sales U.O.M</th>
              <th className="p-3">Standard Price</th>
              <th className="p-3">Min. Sales Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3">
                <select
                  disabled={isReadonly}
                  value={item.sales_uom_id}
                  onChange={(e) =>
                    setItem((prev) => ({
                      ...prev,
                      sales_uom_id: e.target.value,
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
              <td className="p-3">
                <NumericTextInput
                  allowDecimals
                  decimalScale={2}
                  disabled={isReadonly}
                  value={Number(item.standard_sales_price || 0)}
                  onChange={(val) =>
                    setItem((prev) => ({
                      ...prev,
                      standard_sales_price: String(val),
                    }))
                  }
                  className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
              </td>
              <td className="p-3">
                <NumericTextInput
                  allowDecimals
                  decimalScale={2}
                  disabled={isReadonly}
                  value={Number(item.minimum_sales_price ?? item.standard_sales_price ?? 0)}
                  onChange={(val) =>
                    setItem((prev) => ({
                      ...prev,
                      minimum_sales_price: String(val),
                    }))
                  }
                  className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
