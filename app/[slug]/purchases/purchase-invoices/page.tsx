// app/[slug]/purchases/purchase-invoices/page.tsx

import PurchaseInvoiceList from "@/app/components/purchases/purchase-invoices/PurchaseInvoiceList";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PurchaseInvoicesPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div>
      <PurchaseInvoiceList slug={slug} />
    </div>
  );
}
