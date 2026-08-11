// app/[slug]/purchases/supplier/new/page.tsx

import PartyForm from "@/app/components/parties/PartyForm";

export default function NewSupplierPage() {
  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-xl font-semibold">New Supplier</h1>
      </div>
      <PartyForm
        title="Register New Vendor"
        initialFlags={{ is_supplier: true }}
        redirectPath="../supplier"
      />
    </div>
  );
}
