// app/[slug]/sales/crm/page.tsx

import PartyList from "@/app/components/parties/PartyList";

export default function CRMPage() {
  return (
    <div>
      <PartyList
        title="CRM Prospects & Leads"
        roleFlag="is_crm_lead"
        basePath="./crm"
      />
    </div>
  );
}

// export default function CRMPage() {
//   return (
//     <div>
//       <PartyList
//         title="CRM Accounts"
//         module="crm"
//         basePath="./crm"
//         typeFilter={["lead", "customer"]}
//       />
//     </div>
//   );
// }

/* import CRMList from "@/app/components/sales/crm/CRMFormTabs";

export default function CRMPage() {
  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        Sales / CRM
      </h1>

      <CRMList />

    </div>
  );
} */
