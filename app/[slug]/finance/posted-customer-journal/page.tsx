// /app/[slug]/finance/posted-customer-journal/page.tsx

import PostedCustomerJournalList from "@/app/components/finance/PostedCustomerJournalList";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Posted Customer Journals</h1>

      <PostedCustomerJournalList slug={slug} />
    </div>
  );
}
