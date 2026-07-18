// app/[slug]/setup/inventory/brands/new/page.tsx

import BrandForm from "@/app/components/setup/inventory/brands/BrandForm";


export default function NewBrandPage() {
  return (
    <div className="py-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Create Brand
      </h1>

      <BrandForm />
    </div>
  );
}