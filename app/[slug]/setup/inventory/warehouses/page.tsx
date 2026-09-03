// app/[slug]/setup/inventory/warehouses/page.tsx

import WarehouseList from "@/app/components/setup/inventory/warehouses/WarehouseList";

export default function WarehousePage() {
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Inventory / Warehouses</h1>
      </div>

      <WarehouseList />
    </div>
  );
}
