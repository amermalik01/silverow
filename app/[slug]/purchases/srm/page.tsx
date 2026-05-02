// app/[slug]/purchases/srm/page.tsx
import PartyList from "@/app/components/parties/PartyList";

export default function SRMPage() {
  return (
    <div className="p-6 space-y-6">

      <PartyList
        title="Supplier Relationship Management"
        module="srm"
        basePath="./srm"
        typeFilter={["supplier"]}
      />

    </div>
  );
}