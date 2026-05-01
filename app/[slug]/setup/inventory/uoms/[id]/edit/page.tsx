// app/[slug]/setup/inventory/uoms/[id]/edit/page.tsx

import UOMForm from "@/app/components/setup/inventory/uoms/UOMForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditUOMPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Edit UOM</h1>

      <UOMForm id={id} />
    </div>
  );
}
