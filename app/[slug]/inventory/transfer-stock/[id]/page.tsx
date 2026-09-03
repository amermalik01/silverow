//  app/[slug]/inventory/transfer-stock/[id]/page.tsx

import TransferStockForm from "@/app/components/inventory/stock-transfer/TransferStockForm";

export default async function TransferStockEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;

  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">
          Edit Transfer Stock
        </h1>
      </div>

      <TransferStockForm transferStockId={resolvedParams.id} mode="edit" />
    </div>
  );
}
