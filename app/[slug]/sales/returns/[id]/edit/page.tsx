// /app/[slug]/sales/returns/[id]/edit/page.tsx

import SalesReturnForm from "@/app/components/sales/returns/SalesReturnForm";

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function SalesReturnEditPage({ params }: Props) {
  const { slug, id } = await params;
  return <SalesReturnForm slug={slug} id={id} isReadOnly />;
}
