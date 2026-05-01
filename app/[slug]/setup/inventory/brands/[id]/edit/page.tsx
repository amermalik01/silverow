// app/[slug]/setup/inventory/brands/[id]/edit/page.tsx

import BrandForm from "@/app/components/setup/inventory/brands/BrandForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditBrandPage({
  params,
}: Props) {
  const { id } = await params;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Edit Brand
      </h1>

      <BrandForm id={id} />
    </div>
  );
}