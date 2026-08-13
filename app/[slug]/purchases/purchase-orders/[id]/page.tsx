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
    <div className="space-y-6 container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold  px-4">View Purchase Order</h1>
      </div>

      <PurchaseOrderForm slug={slug} id={id} isReadOnly />
    </div>
  );
}
