// app/[slug]/setup/inventory/warehouses/[id]/edit/page.tsx

import WarehouseRecord from "@/app/components/setup/inventory/warehouses/WarehouseRecord";
import Link from "next/link";

export default async function EditWarehousePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      {/* container mx-auto py-6 space-y-6 px-4 sm:px-6 */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <nav className="text-xs text-slate-500 space-x-1.5 flex items-center mb-1">
            <Link href={`/${slug}/setup/inventory/warehouses`} className="hover:text-slate-800">
              Setup / Warehouse
            </Link>
            <span>/</span>
            <Link href={`/${slug}/setup/inventory/warehouses/${id}`} className="hover:text-slate-800">
              Record #{id.slice(-6)}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">Edit</span>
          </nav>
          <h1 className="text-xl font-bold text-slate-900">Edit Warehouse</h1>
        </div>
      </div>

      <WarehouseRecord id={id} isReadOnly={false} />
    </div>
  );
}

/* import WarehouseForm from "@/app/components/setup/inventory/warehouses/WarehouseForm";

export default async function EditWarehousePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="py-6 space-y-6">
      <h1 className="text-xl font-semibold">Edit Warehouse</h1>

      <WarehouseForm id={id} />
    </div>
  );
} */