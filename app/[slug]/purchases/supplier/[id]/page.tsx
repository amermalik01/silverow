// app/[slug]/purchases/supplier/[id]/page.tsx

import PartyRecord from "@/app/components/parties/PartyRecord";

export default async function ViewSupplierPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          View Supplier Account
        </h1>
      </div>

      <PartyRecord id={id} module="supplier" isReadonly={true} />
    </div>
  );
}
