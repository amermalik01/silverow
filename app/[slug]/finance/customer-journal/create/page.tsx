// /app/[slug]/finance/customer-journal/create/page.tsx

import CustomerJournalForm from "@/app/components/finance/CustomerJournalForm";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Customer Journal / Create</h1>

      <CustomerJournalForm slug={slug} />
    </div>
  );
}
