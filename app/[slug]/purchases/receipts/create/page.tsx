// app/[slug]/purchases/receipts/create/page.tsx

import PurchaseReceiptForm from "@/app/components/purchases/receipts/PurchaseReceiptForm";


export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;

  searchParams: Promise<{
    po?: string;
  }>;
}) {
  const { slug } = await params;

  const { po } = await searchParams;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Create Purchase Receipt
      </h1>

      <PurchaseReceiptForm
        slug={slug}
        purchaseOrderId={po}
      />
    </div>
  );
}

/* export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Create Purchase Receipt
      </h1>

      <PurchaseReceiptForm slug={slug} />
    </div>
  );
} */