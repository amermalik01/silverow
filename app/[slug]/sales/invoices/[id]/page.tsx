// /app/[slug]/sales/invoices/[id]/page.tsx
import { SalesInvoiceForm } from "@/app/components/sales/invoices/SalesInvoiceForm";

type PageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function SalesInvoicePage({ params }: PageProps) {
  const { slug, id } = await params;

  return <SalesInvoiceForm slug={slug} id={id} />;
}
