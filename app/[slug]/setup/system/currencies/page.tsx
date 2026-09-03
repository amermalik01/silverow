// app/[slug]/setup/system/currencies/page.tsx

import CompanyCurrencies from "@/app/components/setup/general/currencies/CompanyCurrencies";

export default function CurrenciesPage() {
  return (
    <div className="space-y-6 rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Setup / System / Currencies</h1>
      </div>

      <CompanyCurrencies />
    </div>
  );
}
