// app/[slug]/purchases/srm/[id]/edit/page.tsx

import PartyRecord from "@/app/components/parties/PartyRecord";

export default async function EditSRMPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Edit SRM Account</h1>
      </div>

      <PartyRecord id={id} module="srm" />
    </div>
  );
}
