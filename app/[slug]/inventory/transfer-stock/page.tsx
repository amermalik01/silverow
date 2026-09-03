//  app/[slug]/inventory/transfer-stock/page.tsx

import StockTransferList from "@/app/components/inventory/stock-transfer/TransferStockList";

export default async function TransferStockPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Logistics / Stock Transfers
        </h1>
      </div>

      <StockTransferList
        slug={slug}
        title="Stock Transfer Orders"
        apiBase="/api/inventory/transfer-stock"
        createPath={`/${slug}/inventory/transfer-stock/create`}
      />
    </div>
  );
}
