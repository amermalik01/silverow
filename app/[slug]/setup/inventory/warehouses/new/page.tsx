// app/[slug]/setup/inventory/warehouses/new/page.tsx

import WarehouseForm from "@/app/components/setup/inventory/warehouses/WarehouseForm";

export default function NewWarehousePage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Create Warehouse</h1>

      <WarehouseForm />
    </div>
  );
}