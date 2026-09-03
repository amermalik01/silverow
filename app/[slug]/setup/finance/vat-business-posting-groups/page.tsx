// app/[slug]/setup/finance/vat-business-posting-groups/page.tsx

import VatBusinessPostingGroupsList from "@/app/components/setup/VatBusinessPostingGroupsList";

export default function VatBusinessPostingGroupsPage() {
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold mb-4">VAT Business Posting Groups</h1>
      </div>

      <VatBusinessPostingGroupsList />
    </div>
  );
}
