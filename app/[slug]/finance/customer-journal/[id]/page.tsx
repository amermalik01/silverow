// /app/[slug]/finance/customer-journal/[id]/page.tsx

import CustomerJournalForm from "@/app/components/finance/CustomerJournalForm";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Customer Journal</h1>

      <CustomerJournalForm slug={slug} journalId={id} />
    </div>
  );
}
