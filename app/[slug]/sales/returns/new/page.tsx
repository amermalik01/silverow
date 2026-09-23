// /app/[slug]/sales/returns/new/page.tsx

import SalesReturnForm from "@/app/components/sales/returns/SalesReturnForm";

type Props = { params: Promise<{ slug: string }> };

export default async function NewSalesReturnPage({ params }: Props) {
  const { slug } = await params;
  return <SalesReturnForm slug={slug} />;
}
