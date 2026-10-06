// app/[slug]/inventory/transfer-stock/page.tsx

import StockTransferList from "@/app/components/inventory/stock-transfer/TransferStockList";

export default async function TransferStockPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <StockTransferList
      slug={slug}
      title="Stock Transfer"
      moduleKey="stock_transfer_orders"
      sourceType="STOCK_TRANSFER"
      createPath={`/${slug}/inventory/transfer-stock/create`}
    />
  );
}
