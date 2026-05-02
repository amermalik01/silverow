// app/[slug]/purchases/supplier/new/page.tsx
import PartyForm from "@/app/components/parties/PartyForm";

export default function NewSupplierPage() {
  return (
    <div className="p-6">
      <PartyForm
        title="Create Supplier"
        type="supplier"
        redirectPath="../supplier"
      />
    </div>
  );
}