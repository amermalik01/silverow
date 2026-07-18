// app/[slug]/sales/customer/[id]/page.tsx

import PartyRecord from "@/app/components/parties/PartyRecord";

export default async function ViewCustomerPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          View Customer
        </h1>
      </div>

      <PartyRecord id={id} module="customer" isReadonly={true} />
    </div>
  );
}
