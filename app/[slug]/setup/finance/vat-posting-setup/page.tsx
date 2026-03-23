// app/[slug]/setup/finance/vat-posting-setup/page.tsx
import VatPostingSetupList from "@/app/components/setup/VatPostingSetupList";

export default function VatPostingSetupPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        VAT Posting Setup
      </h1>

      <VatPostingSetupList />
    </div>
  );
}