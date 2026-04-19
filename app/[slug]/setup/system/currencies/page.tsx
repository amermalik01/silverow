// app/[slug]/setup/system/currencies/page.tsx

import CompanyCurrencies from "@/app/components/setup/general/currencies/CompanyCurrencies";

export default function CurrenciesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Setup / System / Currencies</h1>

      <CompanyCurrencies />
    </div>
  );
}
