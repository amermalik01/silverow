// app/[slug]/sales/customer/page.tsx

import PartyList from "@/app/components/parties/PartyList";

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PartyList
      slug={slug}
      title="Customers"
      moduleKey="customers"
      roleFlag="is_customer"
      basePath="sales/customer"
    />
  );
}

/* export default function CustomerPage() {
  return (
    <div>
      <PartyList
        title="Customers"
        roleFlag="is_customer"
        basePath="./customer"
      />
    </div>
  );
} */
