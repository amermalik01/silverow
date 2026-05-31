// app/[slug]/sales/customer/new/page.tsx

import PartyForm from "@/app/components/parties/PartyForm";

export default function NewCustomerPage() {
  return (
    <div>
      <PartyForm
        title="Register New Customer Record"
        initialFlags={{ is_customer: true }}
        redirectPath="../customer"
      />
    </div>
  );
}
