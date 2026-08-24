// app/components/inventory/items/tabs/MarginAnalysisTab.tsx

"use client";

type Props = { itemId: string; isReadonly?: boolean };

export default function MarginAnalysisTab({ itemId }: Props) {
  return (
    <div className="space-y-4 text-xs">
      <h3 className="font-semibold text-slate-700 dark:text-slate-300">
        Additional Cost Adjustments
      </h3>
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b">
            <tr>
              <th className="p-3">Cost Component</th>
              <th className="p-3">Currency</th>
              <th className="p-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={3} className="p-4 text-center text-slate-400">
                No additional margin adjustments configured for item {itemId}.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
