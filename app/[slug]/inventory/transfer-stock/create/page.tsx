//  app/[slug]/inventory/transfer-stock/create/page.tsx

import TransferStockForm from "@/app/components/inventory/stock-transfer/TransferStockForm";

export default async function TransferStockCreatePage() {

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transfer Stock Create</h1>

      <TransferStockForm mode="create" />
    </div>
  );
}
