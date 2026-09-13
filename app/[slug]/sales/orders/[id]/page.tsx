// /app/[slug]/sales/orders/[id]/page.tsx

import { SalesOrderForm } from "@/app/components/sales/orders/SalesOrderForm";

type Props = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function ViewSalesOrderPage({ params }: Props) {
  const { slug, id } = await params;

  return <SalesOrderForm slug={slug} id={id} isReadOnly />;
}
