// app/[slug]/setup/inventory/uoms/new/page.tsx

import UOMForm from "@/app/components/setup/inventory/uoms/UOMForm";

export default function NewUOMPage() {
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Create UOM</h1>
      </div>

      <UOMForm />
    </div>
  );
}
