// /app/[slug]/finance/posted-customer-journal/[id]/page.tsx

import JournalPostedView from "@/app/components/finance/journals/JournalPostedView";

export default async function PostedCustomerJournalViewPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Posted Customer Journal</h1>

      <JournalPostedView id={id} apiBase="/api/journals" />
    </div>
  );
}

/* import PostedCustomerJournalView from "@/app/components/finance/PostedCustomerJournalView";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Finance / Posted Customer Journal / View
      </h1>

      <PostedCustomerJournalView id={id} />
    </div>
  );
} */
