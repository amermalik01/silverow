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
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
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
                {/* <input
                  type="number"
                  disabled={isReadonly}
                  value={item.standard_sales_price}
                  onChange={(e) =>
                    setItem((prev) => ({
                      ...prev,
                      standard_sales_price: e.target.value,
                    }))
                  }
                  className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full"
                /> */}

                <NumericTextInput
                  allowDecimals
                  decimalScale={2}
                  disabled={isReadonly}
                  value={Number(item.standard_sales_price)}
                  onChange={(val) =>
                    setItem((prev) => ({
                      ...prev,
                      standard_sales_price: String(val),
                    }))
                  }
                  className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full"
                />
              </td>
              <td className="p-3">
                {/* <input
                  type="number"
                  disabled={isReadonly}
                  defaultValue={item.standard_sales_price}
                  className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full"
                /> */}

                <NumericTextInput
                  allowDecimals
                  decimalScale={2}
                  disabled={isReadonly}
                  value={Number(item.standard_sales_price)}
                  onChange={(val) =>
                    setItem((prev) => ({
                      ...prev,
                      standard_sales_price: String(val),
                    }))
                  }
                  className="border border-slate-200 dark:border-slate-800 rounded p-1.5 w-full"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
