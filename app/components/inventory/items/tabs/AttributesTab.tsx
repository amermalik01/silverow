// app/components/inventory/items/tabs/AttributesTab.tsx

"use client";

import { Button } from "@/components/ui/button";

type Props = { itemId: string; isReadonly?: boolean };

export default function AttributesTab({ itemId, isReadonly = false }: Props) {
  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300">
          Custom Attributes
        </h3>
        {!isReadonly && (
          <Button
            type="button"
            size="sm"
            // className="bg-blue-600 text-white text-xs"
            variant="add_line"
          >
            + Add Attribute
          </Button>
        )}
      </div>
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b">
            <tr>
              <th className="p-3">Attribute</th>
              <th className="p-3">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={2} className="p-4 text-center text-slate-400">
                No custom attributes set.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
