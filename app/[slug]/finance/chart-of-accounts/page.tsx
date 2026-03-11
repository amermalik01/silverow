// app/[slug]/finance/chart-of-accounts/page.tsx

import ChartOfAccountsList from "../ChartOfAccountsList";

export default async function ChartOfAccountsPage() {
  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">
        Finance / Chart of Accounts
      </h1>

      <ChartOfAccountsList />

    </div>
  );
}