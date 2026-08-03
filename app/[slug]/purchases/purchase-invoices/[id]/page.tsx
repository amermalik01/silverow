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
    <div>
      <PurchaseInvoiceForm slug={slug} id={id} />
    </div>
  );
}
