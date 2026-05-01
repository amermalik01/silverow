// app/[slug]/setup/inventory/categories/page.tsx

import CategoryList from "@/app/components/setup/inventory/categories/CategoryList";

export default function CategoriesPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Inventory / Categories
      </h1>

      <CategoryList />
    </div>
  );
}