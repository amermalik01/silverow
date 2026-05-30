// /app/[slug]/sales/returns/page.tsx

import SalesReturnList from "@/app/components/sales/returns/SalesReturnList";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SalesReturnsListPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <div>
      <SalesReturnList slug={slug} />
    </div>
  );
}
