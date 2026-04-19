// app/[slug]/setup/inventory/warehouses/[id]/edit/page.tsx

import WarehouseForm from "@/app/components/setup/inventory/warehouses/WarehouseForm";

export default async function EditWarehousePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Edit Warehouse</h1>

      <WarehouseForm id={id} />
    </div>
  );
}