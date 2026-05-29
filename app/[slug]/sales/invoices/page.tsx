// /app/[slug]/sales/invoices/page.tsx
import SalesInvoiceList from "@/app/components/sales/invoices/SalesInvoiceList";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SalesInvoiceListPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <div>
      <SalesInvoiceList slug={slug} />
    </div>
  );
}