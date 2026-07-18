// app/[slug]/purchases/supplier/[id]/edit/page.tsx

import PartyRecord from "@/app/components/parties/PartyRecord";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Edit Supplier</h1>
      </div>

      <PartyRecord id={id} module="supplier" />
    </div>
  );
}
