// app/[slug]/setup/inventory/uoms/page.tsx

import UOMList from "@/app/components/setup/inventory/uoms/UOMList";

export default function UOMsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Inventory / UOMs</h1>

      <UOMList />
    </div>
  );
}
