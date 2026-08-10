// /app/[slug]/sales/orders/[id]/page.tsx

import SalesOrderForm from "@/app/components/sales/orders/SalesOrderForm";

type Props = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function ViewSalesOrderPage({ params }: Props) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold px-4">View Sales Order</h1>
      </div>

      <SalesOrderForm slug={slug} id={id} isReadOnly />
    </div>
  );
}
