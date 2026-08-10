// app/[slug]/setup/finance/vat-rates/page.tsx

import VatRatesList from "@/app/components/setup/VatRatesList";

export default function VatRatesPage() {
  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Setup / Finance / VAT Rates</h1>
      </div>

      <VatRatesList />
    </div>
  );
}
