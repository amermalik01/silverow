// app/[slug]/purchases/purchase-orders/page.tsx

import PurchaseOrderList from "@/app/components/purchases/purchase-orders/PurchaseOrderList";

export default async function PurchaseOrdersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Purchases / Purchase Orders
      </h1>

      <PurchaseOrderList slug={slug} />
    </div>
  );
}