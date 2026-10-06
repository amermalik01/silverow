//  app/[slug]/inventory/transfer-stock/[id]/page.tsx

import TransferStockForm from "@/app/components/inventory/stock-transfer/TransferStockForm";

export default async function TransferStockEditPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6 ">

      <TransferStockForm transferStockId={id} mode="edit" />

      {/* <TransferStockForm
        slug={slug}
        journalId={id}
        apiBase="/api/finance/item-journal"
        redirectPath={`/${slug}/finance/item-journal`}
      /> */}
    </div>
  );
}
