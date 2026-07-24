// app/[slug]/setup/inventory/warehouses/[id]/page.tsx

import WarehouseRecord from "@/app/components/setup/inventory/warehouses/WarehouseRecord";
import Link from "next/link";

export default async function ViewWarehousePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="py-6 space-y-6 px-4 sm:px-6">

      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <nav className="text-xs text-slate-500 space-x-1.5 flex items-center mb-1">
            <Link href={`/${slug}/setup/inventory/warehouses`} className="hover:text-slate-800 transition-colors">
              Setup / Warehouse
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">View Record</span>
          </nav>
          <h1 className="text-xl font-bold text-slate-900">Warehouse Details</h1>
        </div>

        <Link
          href={`/${slug}/setup/inventory/warehouses/${id}/edit`}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition-colors"
        >
          ✏ Edit Warehouse
        </Link>
      </div>

      <WarehouseRecord id={id} isReadOnly={true} />
    </div>
  );
}

/* export default async function ViewWarehousePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="py-6 space-y-6 px-4 sm:px-6">
   
      <nav className="text-xs text-slate-500 space-x-1.5 flex items-center">
        <Link href={`/${slug}/setup/inventory/warehouses`} className="hover:text-slate-800 transition-colors">
          Warehouses
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-700">Record #{id.slice(-6)}</span>
      </nav>

      <WarehouseRecord id={id} />
    </div>
  );
} */