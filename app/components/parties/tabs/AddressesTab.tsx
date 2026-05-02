// components/parties/tabs/AddressesTab.tsx
"use client";

import { PartyAddressDraft } from "@/types/erp";

type Props = {
  addresses: PartyAddressDraft[];
  setAddresses: React.Dispatch<
    React.SetStateAction<PartyAddressDraft[]>
  >;
};

export default function AddressesTab({
  addresses,
  setAddresses,
}: Props) {
  const addAddress = () => {
    setAddresses([
      ...addresses,
      {
        address_1: "",
        address_2: "",
        city: "",
        county: "",
        postcode: "",
        country_id: "",
        phone: "",
        email: "",
        is_primary: false,
        is_billing: false,
        is_shipping: false,
      },
    ]);
  };

  const updateAddress = (
    index: number,
    key: keyof PartyAddressDraft,
    value: string | boolean,
  ) => {
    const updated = [...addresses];

    updated[index] = {
      ...updated[index],
      [key]: value,
    };

    setAddresses(updated);
  };

  const removeAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const setPrimary = (index: number) => {
    setAddresses(
      addresses.map((a, i) => ({
        ...a,
        is_primary: i === index,
      })),
    );
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Addresses</h2>

        <button
          onClick={addAddress}
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          + Add Address
        </button>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {addresses.map((a, i) => (
          <div
            key={i}
            className="border p-4 rounded grid grid-cols-2 gap-3 relative"
          >
            {/* REMOVE */}
            <button
              onClick={() => removeAddress(i)}
              className="absolute top-2 right-2 text-red-500 text-sm"
            >
              ✕
            </button>

            {/* ADDRESS 1 */}
            <input
              placeholder="Address Line 1"
              value={a.address_1}
              onChange={(e) =>
                updateAddress(i, "address_1", e.target.value)
              }
              className="border p-2 rounded"
            />

            {/* ADDRESS 2 */}
            <input
              placeholder="Address Line 2"
              value={a.address_2 || ""}
              onChange={(e) =>
                updateAddress(i, "address_2", e.target.value)
              }
              className="border p-2 rounded"
            />

            {/* CITY */}
            <input
              placeholder="City"
              value={a.city || ""}
              onChange={(e) =>
                updateAddress(i, "city", e.target.value)
              }
              className="border p-2 rounded"
            />

            {/* COUNTY */}
            <input
              placeholder="County"
              value={a.county || ""}
              onChange={(e) =>
                updateAddress(i, "county", e.target.value)
              }
              className="border p-2 rounded"
            />

            {/* POSTCODE */}
            <input
              placeholder="Postcode"
              value={a.postcode || ""}
              onChange={(e) =>
                updateAddress(i, "postcode", e.target.value)
              }
              className="border p-2 rounded"
            />

            {/* COUNTRY */}
            <input
              placeholder="Country ID"
              value={a.country_id || ""}
              onChange={(e) =>
                updateAddress(i, "country_id", e.target.value)
              }
              className="border p-2 rounded"
            />

            {/* PHONE */}
            <input
              placeholder="Phone"
              value={a.phone || ""}
              onChange={(e) =>
                updateAddress(i, "phone", e.target.value)
              }
              className="border p-2 rounded"
            />

            {/* EMAIL */}
            <input
              placeholder="Email"
              value={a.email || ""}
              onChange={(e) =>
                updateAddress(i, "email", e.target.value)
              }
              className="border p-2 rounded"
            />

            {/* FLAGS */}
            <div className="col-span-2 flex gap-6 pt-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={a.is_primary}
                  onChange={() => setPrimary(i)}
                />
                Primary
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={a.is_billing || false}
                  onChange={(e) =>
                    updateAddress(i, "is_billing", e.target.checked)
                  }
                />
                Billing
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={a.is_shipping || false}
                  onChange={(e) =>
                    updateAddress(i, "is_shipping", e.target.checked)
                  }
                />
                Shipping
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}