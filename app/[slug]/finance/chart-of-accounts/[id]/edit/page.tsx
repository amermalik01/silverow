// app/[slug]/finance/chart-of-accounts/[id]/edit/page.tsx

import AccountForm from "@/app/components/finance/AccountForm";
// import EditAccountForm from "@/app/components/finance/EditAccountForm";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">
          Finance / Chart of Accounts / Edit
        </h1>
      </div>

      <AccountForm slug={slug} id={id} />
    </div>
  );
}
