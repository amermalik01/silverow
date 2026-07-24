// app/[slug]/setup/inventory/warehouses/new/page.tsx

import WarehouseRecord from "@/app/components/setup/inventory/warehouses/WarehouseRecord";
import Link from "next/link";

export default async function NewWarehousePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="py-6 space-y-6 px-4 sm:px-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <nav className="text-xs text-slate-500 space-x-1.5 flex items-center mb-1">
            <Link
              href={`/${slug}/setup/inventory/warehouses`}
              className="hover:text-slate-800"
            >
              Setup / Warehouse
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">New Record</span>
          </nav>
          <h1 className="text-xl font-bold text-slate-900">Create Warehouse</h1>
        </div>
      </div>

      <WarehouseRecord isReadOnly={false} />
    </div>
  );
}