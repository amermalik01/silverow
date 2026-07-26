// app/[slug]/purchases/purchase-orders/[id]/edit/page.tsx

import { PurchaseOrderForm } from "@/app/components/purchases/purchase-orders/PurchaseOrderForm";

export default async function EditPurchaseOrderPage({
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
      <h1 className="text-2xl font-bold  px-4">Edit Purchase Order</h1>

      <PurchaseOrderForm slug={slug} id={id} />
    </div>
  );
}
