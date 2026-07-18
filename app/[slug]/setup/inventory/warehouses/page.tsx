// app/[slug]/setup/inventory/warehouses/page.tsx

import WarehouseList from "@/app/components/setup/inventory/warehouses/WarehouseList";

export default function WarehousePage() {
  return (
    <div className="py-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Inventory / Warehouses
      </h1>

      <WarehouseList />
    </div>
  );
}