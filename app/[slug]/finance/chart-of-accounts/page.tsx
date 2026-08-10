// app/[slug]/finance/chart-of-accounts/page.tsx

import ChartOfAccountsList from "../ChartOfAccountsList";

export default async function ChartOfAccountsPage() {
  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">

      <h1 className="text-2xl font-bold">
        Finance / Chart of Accounts
      </h1>
      </div>

      <ChartOfAccountsList />

    </div>
  );
}