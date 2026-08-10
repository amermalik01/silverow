// app/[slug]/setup/finance/vat-product-posting-groups/page.tsx

import VatProductPostingGroupsList from "@/app/components/setup/VatProductPostingGroupsList";

export default function VatProductPostingGroupsPage() {
  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold mb-4">VAT Product Posting Groups</h1>
      </div>

      <VatProductPostingGroupsList />
    </div>
  );
}
