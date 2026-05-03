// /app/[slug]/finance/posted-customer-journal/page.tsx

import JournalPostedList from "@/app/components/finance/journals/JournalPostedList";

export default async function PostedCustomerJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Posted Customer Journals</h1>

      <JournalPostedList
        slug={slug}
        title="Posted Customer Journals"
        journalType="customer"
        apiBase="/api/journals"
        viewPath={`/${slug}/finance/posted-customer-journal`}
      />
    </div>
  );
}

/* import PostedCustomerJournalList from "@/app/components/finance/PostedCustomerJournalList";

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
} */
