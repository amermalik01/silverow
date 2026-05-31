// app/[slug]/purchases/purchase-orders/[id]/page.tsx

import { PurchaseOrderForm } from "@/app/components/purchases/purchase-orders/PurchaseOrderForm";

export default async function ViewPurchaseOrderPage({
  params,
}: {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">View Purchase Order</h1>

      <PurchaseOrderForm slug={slug} id={id} isReadOnly />
    </div>
  );
}
