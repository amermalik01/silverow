// app/[slug]/sales/customer/[id]/edit/page.tsx

import PartyRecord from "@/app/components/parties/PartyRecord";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Edit Customer</h1>
      </div>

      <PartyRecord id={id} module="customer" />
    </div>
  );
}
