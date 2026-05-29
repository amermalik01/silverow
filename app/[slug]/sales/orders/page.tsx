// app/[slug]/sales/orders/page.tsx

import SalesOrderList from "@/app/components/sales/orders/SalesOrderList";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SalesOrdersPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div>
      <SalesOrderList slug={slug} />
    </div>
  );
}
