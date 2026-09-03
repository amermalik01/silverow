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
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Edit UOM</h1>
      </div>

      <UOMForm id={id} />
    </div>
  );
}
