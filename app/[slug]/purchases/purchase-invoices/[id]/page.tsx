// app/[slug]/purchases/purchase-invoices/[id]/page.tsx

import { PurchaseInvoiceForm } from "@/app/components/purchases/purchase-invoices/PurchaseInvoiceForm";

type Props = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function ViewPurchaseInvoicePage({ params }: Props) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold  px-4">View Purchase Invoice</h1>
      </div>
      <PurchaseInvoiceForm slug={slug} id={id} />
    </div>
  );
}
