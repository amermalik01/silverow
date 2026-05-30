// /app/[slug]/sales/returns/new/page.tsx

import SalesReturnFormView from "@/app/components/sales/returns/SalesReturnFormView";

type PageProps = { params: Promise<{ slug: string }> };

export default async function NewSalesReturnPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <div>
      <SalesReturnFormView slug={slug} />
    </div>
  );
}
