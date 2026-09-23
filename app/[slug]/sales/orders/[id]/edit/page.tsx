// /app/[slug]/sales/orders/[id]/edit/page.tsx

import { SalesOrderForm } from "@/app/components/sales/orders/SalesOrderForm";

type Props = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function EditSalesOrderPage({ params }: Props) {
  const { slug, id } = await params;
  return <SalesOrderForm slug={slug} id={id} isReadOnly />;
}
