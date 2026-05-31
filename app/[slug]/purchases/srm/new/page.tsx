// app/[slug]/purchases/srm/new/page.tsx

import PartyForm from "@/app/components/parties/PartyForm";

export default function NewSRMPage() {
  return (
    <div>
      <PartyForm
        title="Register SRM Strategic Vendor"
        initialFlags={{ is_srm_vendor: true }}
        redirectPath="../srm"
      />
    </div>
  );
}
