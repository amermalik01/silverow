// app/[slug]/setup/inventory/brands/page.tsx

import BrandList from "@/app/components/setup/inventory/brands/BrandList";

export default function BrandsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Inventory / Brands
      </h1>

      <BrandList />
    </div>
  );
}