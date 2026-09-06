// /app/[slug]/sales/orders/new/page.tsx

import { SalesOrderForm } from "@/app/components/sales/orders/SalesOrderForm";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewSalesOrderPage({ params }: Props) {
  const { slug } = await params;

  return <SalesOrderForm slug={slug} />;
}
/* return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">New Sales Order</h1>
      </div>
      <SalesOrderForm slug={slug} />
    </div>
  ); */
