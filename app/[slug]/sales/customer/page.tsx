// app/[slug]/sales/customer/page.tsx

import PartyList from "@/app/components/parties/PartyList";

export default function CustomerPage() {
  return (
    <div>
      <PartyList
        title="Customers"
        roleFlag="is_customer"
        basePath="./customer"
      />
    </div>
  );
}

// export default function CustomerPage() {
//   return (
//     <div>
//       <PartyList
//         title="Customers"
//         module="crm"
//         basePath="./customer"
//         typeFilter={["customer"]}
//       />
//     </div>
//   );
// }
