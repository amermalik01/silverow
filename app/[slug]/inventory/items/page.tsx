// app/[slug]/inventory/items/page.tsx

import ItemList from "@/app/components/inventory/items/ItemList";

export default function ItemsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory / Items</h1>
      </div>

      <ItemList />
    </div>
  );
}
