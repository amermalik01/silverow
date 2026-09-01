// app/[slug]/sales/crm/[id]/page.tsx

import PartyRecord from "@/app/components/parties/PartyRecord";

export default async function ViewCRMPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id,slug } = await params;

  return (
    <div className="space-y-6 container mx-auto p-4">
      {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          View CRM
        </h1>
      </div> */}

      <PartyRecord id={id} module="crm" slug={slug} isReadonly={true} />
    </div>
  );
}

// import CRMRecord from "@/app/components/sales/crm/CRMRecord";

// export default async function ViewCRMPage({
//   params,
// }: {
//   params: Promise<{ slug: string; id: string }>;
// }) {
//   const { slug, id } = await params;

//   return (
//     <div className="py-6 space-y-6">
//       <div className="flex justify-between items-center">
//         <h1 className="text-xl font-semibold">View CRM Account</h1>
//       </div>

//       <CRMRecord id={id} isReadonly={true} />
//     </div>
//   );
// }
