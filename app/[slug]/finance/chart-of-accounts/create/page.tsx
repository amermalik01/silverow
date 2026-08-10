// /app/[slug]/finance/chart-of-accounts/create/page.tsx

import AccountForm from "@/app/components/finance/AccountForm";
// import CreateAccountForm from "@/app/components/finance/CreateAccountForm";

export default async function CreateAccountPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">
          Finance / Chart of Accounts / Create
        </h1>
      </div>

      {/* <CreateAccountForm slug={slug} /> */}
      <AccountForm slug={slug} />
    </div>
  );
}
