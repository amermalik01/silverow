// app/[slug]/purchases/supplier/page.tsx

import PartyList from "@/app/components/parties/PartyList";

export default function SupplierPage() {
  return (
    <div>
      <PartyList
        title="Suppliers"
        roleFlag="is_supplier"
        basePath="./supplier"
      />
    </div>
  );
}

// export default function SupplierPage() {
//   return (
//     <div>
//       <PartyList
//         title="Suppliers"
//         module="srm"
//         basePath="./supplier"
//         typeFilter={["supplier"]}
//       />
//     </div>
//   );
// }
