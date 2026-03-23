// app/[slug]/setup/finance/vat-business-posting-groups/page.tsx

import VatBusinessPostingGroupsList from "@/app/components/setup/VatBusinessPostingGroupsList";

export default function VatBusinessPostingGroupsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        VAT Business Posting Groups
      </h1>

      <VatBusinessPostingGroupsList />
    </div>
  );
}