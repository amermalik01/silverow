// app/[slug]/setup/inventory/uoms/new/page.tsx

import UOMForm from "@/app/components/setup/inventory/uoms/UOMForm";

export default function NewUOMPage() {
  return (
    <div className="py-6 space-y-6">
      <h1 className="text-2xl font-bold">Create UOM</h1>

      <UOMForm />
    </div>
  );
}
