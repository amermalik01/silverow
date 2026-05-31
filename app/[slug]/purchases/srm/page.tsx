// app/[slug]/purchases/srm/page.tsx

import PartyList from "@/app/components/parties/PartyList";

export default function SRMPage() {
  return (
    <div>
      <PartyList
        title="SRM Vendors"
        roleFlag="is_srm_vendor"
        basePath="./srm"
      />
    </div>
  );
}

// export default function SRMPage() {
//   return (
//     <div>
//       <PartyList
//         title="Supplier Relationship Management"
//         module="srm"
//         basePath="./srm"
//         typeFilter={["supplier"]}
//       />
//     </div>
//   );
// }
