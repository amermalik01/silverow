// /app/[slug]/sales/orders/[id]/page.tsx

import SalesOrderForm from "@/app/components/sales/orders/SalesOrderForm";

type Props = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function EditSalesOrderPage({ params }: Props) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Sales Order</h1>

      <SalesOrderForm slug={slug} id={id} />
    </div>
  );
}
