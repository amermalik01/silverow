//  app/[slug]/inventory/transfer-stock/create/page.tsx

import TransferStockForm from "@/app/components/inventory/stock-transfer/TransferStockForm";

export default async function TransferStockCreatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6 ">
      <TransferStockForm mode="create" />
      {/* <TransferStockForm
        slug={slug}
        apiBase="/api/finance/item-journal"
        redirectPath={`/${slug}/finance/item-journal`}
      /> */}
    </div>
  );
}
