// app/[slug]/sales/customer/new/page.tsx

import PartyForm from "@/app/components/parties/PartyForm";

export default function NewCustomerPage() {
  return (
    <div className="p-6">
      <PartyForm
        title="Create Customer"
        type="customer"
        redirectPath="../customer"
      />
    </div>
  );
}