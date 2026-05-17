// /app/[slug]/sales/orders/new/page.tsx

import SalesOrderForm from "@/app/components/sales/orders/SalesOrderForm";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewSalesOrderPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Sales Order</h1>

      <SalesOrderForm slug={slug} />
    </div>
  );
}
