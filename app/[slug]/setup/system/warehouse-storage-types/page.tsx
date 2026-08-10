// app/[slug]/setup/system/warehouse-storage-types/page.tsx

import StorageTypes from "@/app/components/setup/inventory/warehouses/storage-types/StorageTypes";

export default function StorageTypesPage() {
  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">
          Setup / System / Warehouse Storage Types
        </h1>
      </div>

      <StorageTypes />
    </div>
  );
}
