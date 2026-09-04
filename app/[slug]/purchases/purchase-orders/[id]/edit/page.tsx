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

  return <PurchaseOrderForm slug={slug} id={id} isReadOnly />;
}
/* return (
    <div className="space-y-6 container mx-auto">
      <PurchaseOrderForm slug={slug} id={id} />
    </div>
  ); */
