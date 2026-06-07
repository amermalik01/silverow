//  app/[slug]/inventory/transfer-stock/[id]/page.tsx

import TransferStockForm from "@/app/components/inventory/stock-transfer/TransferStockForm";

export default async function TransferStockEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

    const resolvedParams = await params;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Edit Transfer Stock</h1>
      </div>

      <TransferStockForm 
        transferStockId={resolvedParams.id}
        mode="edit" 
      />
    </div>
  );
}