// app/[slug]/finance/customer-journal/page.tsx

import CustomerJournalList from "@/app/components/finance/CustomerJournalList";

export default async function CustomerJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finance / Customer Journal</h1>

      <CustomerJournalList slug={slug} />
    </div>
  );
}
