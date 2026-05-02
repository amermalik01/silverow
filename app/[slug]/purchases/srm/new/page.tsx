// app/[slug]/purchases/srm/new/page.tsx

import PartyForm from "@/app/components/parties/PartyForm";

export default function NewSRMPage() {
  return (
    <div className="p-6">
      <PartyForm
        title="Create Supplier (SRM)"
        type="supplier"
        redirectPath="../srm"
      />
    </div>
  );
}