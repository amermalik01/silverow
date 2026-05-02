// app/[slug]/purchases/supplier/page.tsx
import PartyList from "@/app/components/parties/PartyList";

export default function SupplierPage() {
  return (
    <div className="p-6 space-y-6">

      <PartyList
        title="Suppliers"
        module="srm"
        basePath="./supplier"
        typeFilter={["supplier"]}
      />

    </div>
  );
}