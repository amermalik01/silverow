// app/[slug]/purchases/purchase-orders/create/page.tsx

import { PurchaseOrderForm } from "@/app/components/purchases/purchase-orders/PurchaseOrderForm";

export default async function CreatePurchaseOrderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create Purchase Order</h1>

      <PurchaseOrderForm slug={slug} />
    </div>
  );
}
