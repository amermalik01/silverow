// app/[slug]/setup/inventory/brands/[id]/edit/page.tsx

import BrandForm from "@/app/components/setup/inventory/brands/BrandForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditBrandPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Edit Brand</h1>
      </div>

      <BrandForm id={id} />
    </div>
  );
}
