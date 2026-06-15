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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Finance / Chart of Accounts / Create
      </h1>

      {/* <CreateAccountForm slug={slug} /> */}
      <AccountForm slug={slug} />
    </div>
  );
}
