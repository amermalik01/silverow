
// app/components/sales/crm/tabs/AddressesTab.tsx

"use client";
import { Button } from "@/components/ui/button";
import { CRMAddress } from "@/types/crm";

export default function AddressesTab({
  addresses,
  setAddresses,
}: {
  addresses: CRMAddress[];
  setAddresses: React.Dispatch<React.SetStateAction<CRMAddress[]>>;
}) {

  const addAddress = () => {
    setAddresses([...addresses, {
      address_1: "",
      city: "",
      is_primary: false
    }]);
  };

  return (
    <div className="space-y-4">

      <Button
        onClick={addAddress}
        variant="add_line"
        // className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        Add Address
      </Button>

      {addresses.map((a, i) => (
        <div key={i} className="border p-3 rounded grid grid-cols-2 gap-2">

          <input
            placeholder="Address"
            value={a.address_1}
            onChange={(e)=>{
              const updated = [...addresses];
              updated[i].address_1 = e.target.value;
              setAddresses(updated);
            }}
            className="border p-2 rounded"
          />

          <input
            placeholder="City"
            value={a.city}
            onChange={(e)=>{
              const updated = [...addresses];
              updated[i].city = e.target.value;
              setAddresses(updated);
            }}
            className="border p-2 rounded"
          />

        </div>
      ))}

    </div>
  );
}