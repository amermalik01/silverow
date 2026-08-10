// app/[slug]/setup/inventory/categories/[id]/edit/page.tsx

import CategoryForm from "@/app/components/setup/inventory/categories/CategoryForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Edit Category</h1>
      </div>

      <CategoryForm id={id} />
    </div>
  );
}
