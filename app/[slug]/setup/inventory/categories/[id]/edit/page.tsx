// app/[slug]/setup/inventory/categories/[id]/edit/page.tsx

import CategoryForm from "@/app/components/setup/inventory/categories/CategoryForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCategoryPage({
  params,
}: Props) {
  const { id } = await params;

  return (
    <div className="py-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Edit Category
      </h1>

      <CategoryForm id={id} />
    </div>
  );
}