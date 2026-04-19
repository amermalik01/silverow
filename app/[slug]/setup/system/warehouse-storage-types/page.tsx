// app/[slug]/setup/system/warehouse-storage-types/page.tsx

import StorageTypes from "@/app/components/setup/inventory/warehouses/storage-types/StorageTypes";

export default function StorageTypesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Setup / System / Warehouse Storage Types</h1>

      <StorageTypes />
    </div>
  );
}
