// app/[slug]/purchases/supplier/[id]/page.tsx

import PartyRecord from "@/app/components/parties/PartyRecord";

export default async function ViewSupplierPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">View Supplier</h1>
      </div>

      <PartyRecord id={id} module="supplier" isReadonly={true} />
    </div>
  );
}
