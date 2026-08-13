// app/[slug]/purchases/supplier/page.tsx

import PartyList from "@/app/components/parties/PartyList";

export default async function SupplierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PartyList
      slug={slug}
      title="Suppliers"
      moduleKey="suppliers"
      roleFlag="is_supplier"
      basePath="purchases/supplier"
    />
  );
}

/* export default function SupplierPage() {
  return (
    <div>
      <PartyList
        title="Suppliers"
        roleFlag="is_supplier"
        basePath="./supplier"
      />
    </div>
  );
} */
