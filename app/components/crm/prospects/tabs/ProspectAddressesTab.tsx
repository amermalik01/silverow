// app/components/crm/prospects/tabs/ProspectAddressesTab.tsx

"use client";

import type { ProspectAddress } from "@/types/prospect";

type Props = {
  addresses: ProspectAddress[];
  onChange: (addresses: ProspectAddress[]) => void;
};

const inputClass =
  "h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

export default function ProspectAddressesTab({ addresses, onChange }: Props) {
  const update = (
    index: number,
    field: keyof ProspectAddress,
    value: string | boolean | null,
  ) => {
    onChange(
      addresses.map((address, currentIndex) =>
        currentIndex === index ? { ...address, [field]: value } : address,
      ),
    );
  };

  const addAddress = () => {
    onChange([
      ...addresses,
      {
        label: "Branch Office",
        address_1: null,
        address_2: null,
        city: null,
        state: null,
        country: null,
        postcode: null,
        phone: null,
        email: null,
        is_primary: addresses.length === 0,
        is_billing: false,
        is_shipping: false,
      },
    ]);
  };

  const setPrimary = (index: number) => {
    onChange(
      addresses.map((address, currentIndex) => ({
        ...address,
        is_primary: currentIndex === index,
      })),
    );
  };

  const removeAddress = (index: number) => {
    const remaining = addresses.filter(
      (_, currentIndex) => currentIndex !== index,
    );
    if (addresses[index]?.is_primary && remaining.length) {
      remaining[0] = { ...remaining[0], is_primary: true };
    }
    onChange(remaining);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Addresses</h3>
          <p className="text-xs text-slate-500">
            Manage office, billing and shipping addresses.
          </p>
        </div>
        <button
          type="button"
          onClick={addAddress}
          className="rounded-md bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
        >
          + Add Address
        </button>
      </div>

      <div className="space-y-4">
        {addresses.map((address, index) => (
          <div
            key={address.id || `new-address-${index}`}
            className="rounded-lg border border-slate-200 p-3"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <input
                className={`${inputClass} max-w-56`}
                value={address.label}
                onChange={(event) => update(index, "label", event.target.value)}
                placeholder="Address label"
              />
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={address.is_primary}
                    onChange={() => setPrimary(index)}
                    className="accent-emerald-800"
                  />
                  Primary
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={address.is_billing || false}
                    onChange={(event) =>
                      update(index, "is_billing", event.target.checked)
                    }
                    className="accent-emerald-800"
                  />
                  Billing
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={address.is_shipping || false}
                    onChange={(event) =>
                      update(index, "is_shipping", event.target.checked)
                    }
                    className="accent-emerald-800"
                  />
                  Shipping
                </label>
                <button
                  type="button"
                  onClick={() => removeAddress(index)}
                  className="font-medium text-rose-600"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className={`${inputClass} sm:col-span-2`}
                placeholder="Address line 1"
                value={address.address_1 || ""}
                onChange={(event) =>
                  update(index, "address_1", event.target.value)
                }
              />
              <input
                className={`${inputClass} sm:col-span-2`}
                placeholder="Address line 2"
                value={address.address_2 || ""}
                onChange={(event) =>
                  update(index, "address_2", event.target.value)
                }
              />
              <input
                className={inputClass}
                placeholder="City"
                value={address.city || ""}
                onChange={(event) => update(index, "city", event.target.value)}
              />
              <input
                className={inputClass}
                placeholder="State / County"
                value={address.state || ""}
                onChange={(event) => update(index, "state", event.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Country"
                value={address.country || ""}
                onChange={(event) =>
                  update(index, "country", event.target.value)
                }
              />
              <input
                className={inputClass}
                placeholder="Postcode"
                value={address.postcode || ""}
                onChange={(event) =>
                  update(index, "postcode", event.target.value)
                }
              />
              <input
                className={inputClass}
                placeholder="Phone"
                value={address.phone || ""}
                onChange={(event) => update(index, "phone", event.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Email"
                value={address.email || ""}
                onChange={(event) => update(index, "email", event.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
