// app/[slug]/sales/orders/page.tsx

import SalesOrderList from "@/app/components/sales/orders/SalesOrderList";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SalesOrdersPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales Orders</h1>
      </div>

      <SalesOrderList slug={slug} />
    </div>
  );
}
