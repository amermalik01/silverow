// /app/[slug]/sales/invoices/[id]/page.tsx
import SalesInvoiceDetail from "@/app/components/sales/invoices/SalesInvoiceDetail";

type PageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function SalesInvoicePage({ params }: PageProps) {
  const { slug, id } = await params;

  return (
    <div className="min-h-screen bg-gray-50/30 py-8">
      <SalesInvoiceDetail slug={slug} invoiceId={id} />
    </div>
  );
}
