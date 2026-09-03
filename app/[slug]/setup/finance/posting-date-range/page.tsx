// app/[slug]/setup/finance/posting-date-range/page.tsx

import PostingDateRangeSetup from "@/app/components/setup/posting/PostingDateRangeSetup";

export default function PostingGroupsPage() {
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Posting Date Range</h1>
      </div>

      <PostingDateRangeSetup />
    </div>
  );
}
