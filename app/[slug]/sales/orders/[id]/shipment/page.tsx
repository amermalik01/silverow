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
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Shipment Posting</h1>
      </div>

      <ShipmentPostingForm slug={slug} orderId={id} />
    </div>
  );
}
