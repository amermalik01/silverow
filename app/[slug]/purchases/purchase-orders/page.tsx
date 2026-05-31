// app/[slug]/purchases/purchase-orders/page.tsx

import PurchaseOrderList from "@/app/components/purchases/purchase-orders/PurchaseOrderList";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PurchaseOrdersPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div>
      <PurchaseOrderList slug={slug} />
    </div>
  );
}
