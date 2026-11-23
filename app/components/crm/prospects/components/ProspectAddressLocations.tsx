// app/components/crm/prospects/components/ProspectAddressLocations.tsx

"use client";

import { Icon } from "@iconify/react";
import type { ProspectAddress } from "@/types/prospect";

type Props = {
  addresses: ProspectAddress[];
  onChange: (addresses: ProspectAddress[]) => void;
};

const inputClass =
  "h-8 w-full rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-emerald-600";

function createAddress(): ProspectAddress {
  return {
    label: "New Location",
    address_1: null,
    address_2: null,
    city: null,
    state: null,
    country: null,
    postcode: null,
    phone: null,
    email: null,
    is_primary: false,
    is_billing: false,
    is_shipping: false,
  };
}

export default function ProspectAddressLocations({
  addresses,
  onChange,
}: Props) {
  const updateAddress = (
    index: number,
    field: keyof ProspectAddress,
    value: string | boolean,
  ) => {
    onChange(
      addresses.map((address, i) =>
        i === index ? { ...address, [field]: value } : address,
      ),
    );
  };

  const setPrimary = (index: number) => {
    onChange(
      addresses.map((address, i) => ({
        ...address,
        is_primary: i === index,
      })),
    );
  };

  const addAddress = () => {
    onChange([...addresses, createAddress()]);
  };

  const removeAddress = (index: number) => {
    if (addresses[index]?.is_primary && addresses.length > 1) {
      return;
    }

    onChange(addresses.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Icon icon="lucide:map-pin" className="text-emerald-600 text-2xl" />
          Address Locations
        </h2>

        <button
          type="button"
          onClick={addAddress}
          className="flex h-8 items-center gap-2 rounded-lg border border-emerald-600 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
        >
          <Icon icon="lucide:plus" />
          Add location
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {addresses.map((address, index) => (
          <div
            key={address.id || `address-${index}`}
            className="space-y-3 px-5 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={address.label || ""}
                  onChange={(event) =>
                    updateAddress(index, "label", event.target.value)
                  }
                  className="h-8 w-40 border-0 bg-transparent px-0 text-base font-bold text-slate-900 outline-none focus:border-b focus:border-emerald-600"
                  placeholder="Location name"
                />

                {address.is_primary && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    Primary
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {!address.is_primary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(index)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    Set primary
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => removeAddress(index)}
                  disabled={address.is_primary && addresses.length > 1}
                  title="Remove location"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Icon icon="lucide:trash-2" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={address.address_1 || ""}
                onChange={(event) =>
                  updateAddress(index, "address_1", event.target.value)
                }
                placeholder="Address line 1"
                className={inputClass}
              />

              <input
                value={address.address_2 || ""}
                onChange={(event) =>
                  updateAddress(index, "address_2", event.target.value)
                }
                placeholder="Address line 2"
                className={inputClass}
              />

              <input
                value={address.city || ""}
                onChange={(event) =>
                  updateAddress(index, "city", event.target.value)
                }
                placeholder="City"
                className={inputClass}
              />

              <input
                value={address.state || ""}
                onChange={(event) =>
                  updateAddress(index, "state", event.target.value)
                }
                placeholder="State / County"
                className={inputClass}
              />

              <input
                value={address.country || ""}
                onChange={(event) =>
                  updateAddress(index, "country", event.target.value)
                }
                placeholder="Country"
                className={inputClass}
              />

              <input
                value={address.postcode || ""}
                onChange={(event) =>
                  updateAddress(index, "postcode", event.target.value)
                }
                placeholder="Postcode"
                className={inputClass}
              />
            </div>

            <div className="flex flex-wrap gap-4">
              {[
                { field: "is_billing" as const, label: "Billing address" },
                { field: "is_shipping" as const, label: "Shipping address" },
              ].map((option) => (
                <label
                  key={option.field}
                  className="flex items-center gap-2 text-xs text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(address[option.field])}
                    onChange={(event) =>
                      updateAddress(index, option.field, event.target.checked)
                    }
                    className="h-4 w-4 accent-emerald-700"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        ))}

        {addresses.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            No address locations added.
          </div>
        )}
      </div>
    </div>
  );
}
