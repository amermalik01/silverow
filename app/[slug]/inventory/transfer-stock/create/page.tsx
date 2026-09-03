//  app/[slug]/inventory/transfer-stock/create/page.tsx

import TransferStockForm from "@/app/components/inventory/stock-transfer/TransferStockForm";

export default async function TransferStockCreatePage() {
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Transfer Stock Create</h1>
      </div>

      <TransferStockForm mode="create" />
    </div>
  );
}
