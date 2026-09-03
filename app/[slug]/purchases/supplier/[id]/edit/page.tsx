// app/[slug]/purchases/supplier/[id]/edit/page.tsx

import PartyRecord from "@/app/components/parties/PartyRecord";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id, slug } = await params;
  return <PartyRecord id={id} module="supplier" slug={slug} />;
}
/* return (
    <div className="space-y-6 container mx-auto">     
      <PartyRecord id={id} module="supplier" slug={slug} />
    </div>
  ); */

/* 
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
  <h1 className="text-xl font-semibold">Edit Supplier</h1>
</div> */
