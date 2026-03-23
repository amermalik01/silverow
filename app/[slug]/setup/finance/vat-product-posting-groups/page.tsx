// app/[slug]/setup/finance/vat-product-posting-groups/page.tsx

import VatProductPostingGroupsList from "@/app/components/setup/VatProductPostingGroupsList";

export default function VatProductPostingGroupsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        VAT Product Posting Groups
      </h1>

      <VatProductPostingGroupsList />
    </div>
  );
}