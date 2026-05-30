// /app/[slug]/sales/returns/[id]/page.tsx

import SalesReturnFormView from "@/app/components/sales/returns/SalesReturnFormView";

type PageProps = { params: Promise<{ slug: string; id: string }> };

export default async function SalesReturnDetailPage({ params }: PageProps) {
  const { slug, id } = await params;
  return (
    <div>
      <SalesReturnFormView slug={slug} id={id} />
    </div>
  );
}
