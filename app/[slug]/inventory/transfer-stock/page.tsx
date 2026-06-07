//  app/[slug]/inventory/transfer-stock/page.tsx

import StockTransferList from "@/app/components/inventory/stock-transfer/TransferStockList";

export default async function TransferStockPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <div className="p-1">
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
