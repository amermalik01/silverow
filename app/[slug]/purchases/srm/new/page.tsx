// app/[slug]/purchases/srm/new/page.tsx

import PartyForm from "@/app/components/parties/PartyForm";

export default function NewSRMPage() {
  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-xl font-semibold">New SRM</h1>
      </div>
      <PartyForm
        title="Register SRM Strategic Vendor"
        initialFlags={{ is_srm_vendor: true }}
        redirectPath="../srm"
      />
    </div>
  );
}
