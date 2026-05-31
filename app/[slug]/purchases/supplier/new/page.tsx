// app/[slug]/purchases/supplier/new/page.tsx

import PartyForm from "@/app/components/parties/PartyForm";

export default function NewSupplierPage() {
  return (
    <div>
      <PartyForm
        title="Register New Vendor"
        initialFlags={{ is_supplier: true }}
        redirectPath="../supplier"
      />
    </div>
  );
}
