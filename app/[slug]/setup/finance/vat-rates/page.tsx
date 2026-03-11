// app/[slug]/setup/finance/vat-rates/page.tsx

import VatRatesList from "@/app/components/setup/VatRatesList";

export default function VatRatesPage() {

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">
        Setup / Finance / VAT Rates
      </h1>

      <VatRatesList />

    </div>
  );
}