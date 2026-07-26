// /app/[slug]/sales/orders/[id]/edit/page.tsx

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
      <h1 className="text-2xl font-bold px-4">Edit Sales Order</h1>

      <SalesOrderForm slug={slug} id={id} />
    </div>
  );
}
