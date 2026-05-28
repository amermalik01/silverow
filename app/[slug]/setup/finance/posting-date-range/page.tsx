// app/[slug]/setup/finance/posting-date-range/page.tsx

import PostingDateRangeSetup from "@/app/components/setup/posting/PostingDateRangeSetup";

export default function PostingGroupsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Posting Date Range</h1>
      <PostingDateRangeSetup />
    </div>
  );
}
