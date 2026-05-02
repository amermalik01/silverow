// app/[slug]/sales/customer/page.tsx
import PartyList from "@/app/components/parties/PartyList";

export default function CustomerPage() {
  return (
    <div className="p-6 space-y-6">

      <PartyList
        title="Customers"
        module="crm"
        basePath="./customer"
        typeFilter={["customer"]}
      />

    </div>
  );
}