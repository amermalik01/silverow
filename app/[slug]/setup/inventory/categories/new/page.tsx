// app/[slug]/setup/inventory/categories/new/page.tsx

import CategoryForm from "@/app/components/setup/inventory/categories/CategoryForm";

export default function NewCategoryPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Create Category
      </h1>

      <CategoryForm />
    </div>
  );
}