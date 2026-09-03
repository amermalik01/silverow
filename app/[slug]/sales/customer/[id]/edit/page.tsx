// app/[slug]/sales/customer/[id]/edit/page.tsx

import PartyRecord from "@/app/components/parties/PartyRecord";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id,slug } = await params;

  return (
    <div className="space-y-6 ">
      {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-xl font-semibold">Edit Customer</h1>
      </div> */}

      <PartyRecord id={id} module="customer" slug={slug} />
    </div>
  );
}
