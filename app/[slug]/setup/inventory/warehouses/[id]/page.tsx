// app/[slug]/setup/inventory/warehouses/[id]/page.tsx

import WarehouseRecord from "@/app/components/setup/inventory/warehouses/WarehouseRecord";

export default async function ViewWarehousePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="py-6 space-y-6">
      <h1 className="text-xl font-semibold">Warehouse</h1>

      <WarehouseRecord id={id} />
    </div>
  );
}