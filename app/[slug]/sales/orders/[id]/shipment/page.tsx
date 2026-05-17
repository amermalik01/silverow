// /app/[slug]/sales/orders/[id]/shipment/page.tsx

import ShipmentPostingForm from "@/app/components/sales/orders/ShipmentPostingForm";

type Props = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function ShipmentPage({ params }: Props) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shipment Posting</h1>

      <ShipmentPostingForm slug={slug} orderId={id} />
    </div>
  );
}
