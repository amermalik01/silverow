// components/parties/tabs/AddressesTab.tsx

"use client";

import type { PartyAddressDraft } from "@/types/erp";
import MasterDropdown from "@/app/components/common/MasterDropdown";

type Props = {
  addresses: PartyAddressDraft[];
  setAddresses: React.Dispatch<React.SetStateAction<PartyAddressDraft[]>>;
  errors: Record<string, string>;
};

export default function AddressesTab({
  addresses,
  setAddresses,
  errors,
}: Props) {
  const addAddressRow = () => {
    setAddresses([
      ...addresses,
      {
        label: "",
        address_1: "",
        address_2: "",
        city: "",
        state: "",
        postcode: "",
        country: "",
        phone: "",
        email: "",
        is_primary: addresses.length === 0,
        is_billing: true,
        is_shipping: true,
        is_collection: true,
      },
    ]);
  };

  const updateAddressRow = (
    idx: number,
    key: keyof PartyAddressDraft,
    val: string | boolean,
  ) => {
    setAddresses(
      addresses.map((a, i) => (i === idx ? { ...a, [key]: val } : a)),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Location(s)
        </h3>
        <button
          type="button"
          onClick={addAddressRow}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors shadow-sm"
        >
          + Add Location
        </button>
      </div>

      {addresses.length === 0 && (
        <div className="p-8 text-center text-xs border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400">
          No location profiles registered.
        </div>
      )}

      {addresses.map((a, idx) => (
        <div
          key={idx}
          className="relative rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs">Location {idx + 1}</span>

              {a.is_primary && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  Primary
                </span>
              )}

              {a.is_billing && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Billing
                </span>
              )}

              {a.is_shipping && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                  Shipping
                </span>
              )}

              {a.is_collection && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                  Collection
                </span>
              )}
              
            </div>

            <button
              type="button"
              onClick={() =>
                setAddresses(addresses.filter((_, i) => i !== idx))
              }
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4">
            {/* Left */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">Name <span className="text-red-500">*</span></label>

                <input
                  type="text"
                  value={a.label}
                  onChange={(e) =>
                    updateAddressRow(idx, "label", e.target.value)
                  }
                  className="col-span-2 p-2 border rounded text-xs border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">Address Line 1</label>

                <input
                  type="text"
                  value={a.address_1}
                  onChange={(e) =>
                    updateAddressRow(idx, "address_1", e.target.value)
                  }
                  className="col-span-2 p-2 border rounded text-xs border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">Address Line 2</label>

                <input
                  type="text"
                  value={a.address_2 || ""}
                  onChange={(e) =>
                    updateAddressRow(idx, "address_2", e.target.value)
                  }
                  className="col-span-2 p-2 border rounded text-xs border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">City</label>

                <input
                  type="text"
                  value={a.city || ""}
                  onChange={(e) =>
                    updateAddressRow(idx, "city", e.target.value)
                  }
                  className="col-span-2 p-2 border rounded text-xs border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">State / Province</label>

                <input
                  type="text"
                  value={a.state || ""}
                  onChange={(e) =>
                    updateAddressRow(idx, "state", e.target.value)
                  }
                  className="col-span-2 p-2 border rounded text-xs border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Right */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">Postcode</label>

                <input
                  type="text"
                  value={a.postcode || ""}
                  onChange={(e) =>
                    updateAddressRow(idx, "postcode", e.target.value)
                  }
                  className="col-span-2 p-2 border rounded text-xs border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Country
                </label>

                <div className="col-span-2">
                  <MasterDropdown
                    type="country"
                    value={a.country || "United Kingdom"}
                    onChange={(val) => updateAddressRow(idx, "country", val ?? "")}
                    defaultFilter={(item) => item.country_id === 225}
                    // className={
                    //   errors[`addresses.${idx}.country`] ? "border-red-500" : ""
                    // }
                  />
                </div>
              </div>

              {/* <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">Country</label>

                <input
                  type="text"
                  value={a.country || ""}
                  onChange={(e) =>
                    updateAddressRow(idx, "country", e.target.value)
                  }
                  className="col-span-2 p-2 border rounded text-xs border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                />
              </div> */}

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">Telephone</label>

                <input
                  type="text"
                  value={a.phone || ""}
                  onChange={(e) =>
                    updateAddressRow(idx, "phone", e.target.value)
                  }
                  className="col-span-2 p-2 border rounded text-xs border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">Email</label>

                <input
                  type="email"
                  value={a.email || ""}
                  onChange={(e) =>
                    updateAddressRow(idx, "email", e.target.value)
                  }
                  className="col-span-2 p-2 border rounded text-xs border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div className="border rounded-md border-slate-200 dark:border-slate-700 p-3 mt-3">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">
                  Location Usage
                </p>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!a.is_primary}
                      onChange={(e) =>
                        updateAddressRow(idx, "is_primary", e.target.checked)
                      }
                    />
                    Primary Address
                  </label>

                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!a.is_billing}
                      onChange={(e) =>
                        updateAddressRow(idx, "is_billing", e.target.checked)
                      }
                    />
                    Billing Address
                  </label>

                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!a.is_shipping}
                      onChange={(e) =>
                        updateAddressRow(idx, "is_shipping", e.target.checked)
                      }
                    />
                    Shipping Address
                  </label>

                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!a.is_collection}
                      onChange={(e) =>
                        updateAddressRow(idx, "is_collection", e.target.checked)
                      }
                    />
                    Collection Address
                  </label>

                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
/* {addresses.map((a, idx) => (
        <div
          key={idx}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start border border-slate-200 dark:border-slate-800 p-4 relative "
        >
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Name *
              </label>
              <input
                type="text"
                value={a.label}
                onChange={(e) => updateAddressRow(idx, "label", e.target.value)}
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
                // className={`w-full border p-2 rounded text-xs bg-white dark:bg-slate-900 ${errors[`addresses.${idx}.label`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`addresses.${idx}.label`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`addresses.${idx}.label`]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Address Line 1
              </label>
              <input
                type="text"
                value={a.address_1}
                onChange={(e) =>
                  updateAddressRow(idx, "address_1", e.target.value)
                }
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
                // className={`w-full border p-2 rounded text-xs bg-white dark:bg-slate-900 ${errors[`addresses.${idx}.address_1`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`addresses.${idx}.address_1`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`addresses.${idx}.address_1`]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Address Line 2
              </label>
              <input
                type="text"
                value={a.address_2 || ""}
                onChange={(e) =>
                  updateAddressRow(idx, "address_2", e.target.value)
                }
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
                // className="w-full border p-2 rounded text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                City
              </label>
              <input
                type="text"
                value={a.city || ""}
                onChange={(e) => updateAddressRow(idx, "city", e.target.value)}
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
                // className={`w-full border p-2 rounded text-xs bg-white dark:bg-slate-900 ${errors[`addresses.${idx}.city`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`addresses.${idx}.city`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`addresses.${idx}.city`]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                State / Province
              </label>
              <input
                type="text"
                value={a.state || ""}
                onChange={(e) => updateAddressRow(idx, "state", e.target.value)}
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
                // className="w-full border p-2 rounded text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Postcode
              </label>
              <input
                type="text"
                value={a.postcode || ""}
                onChange={(e) =>
                  updateAddressRow(idx, "postcode", e.target.value)
                }
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
                // className={`w-full border p-2 rounded text-xs bg-white dark:bg-slate-900 ${errors[`addresses.${idx}.postcode`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`addresses.${idx}.postcode`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`addresses.${idx}.postcode`]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Country *
              </label>
              <input
                type="text"
                value={a.country || ""}
                placeholder="e.g. US, GB"
                onChange={(e) =>
                  updateAddressRow(idx, "country", e.target.value)
                }
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
                // className={`w-full border p-2 rounded text-xs bg-white dark:bg-slate-900 ${errors[`addresses.${idx}.country`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`addresses.${idx}.country`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`addresses.${idx}.country`]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Telephone
              </label>
              <input
                type="text"
                value={a.phone || ""}
                onChange={(e) => updateAddressRow(idx, "phone", e.target.value)}
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
                // className="w-full border p-2 rounded text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Email
              </label>
              <input
                type="email"
                value={a.email || ""}
                onChange={(e) => updateAddressRow(idx, "email", e.target.value)}
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
                // className={`w-full border p-2 rounded text-xs bg-white dark:bg-slate-900 ${errors[`addresses.${idx}.email`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`addresses.${idx}.email`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`addresses.${idx}.email`]}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() =>
                setAddresses(addresses.filter((_, i) => i !== idx))
              }
              className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors text-base"
            >
              ✕
            </button>

            <div className="md:col-span-2 flex flex-wrap gap-4 pt-2">
              {["is_primary", "is_billing", "is_shipping"].map((f) => (
                <label
                  key={f}
                  className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer capitalize"
                >
                  <input
                    type="checkbox"
                    checked={!!a[f as keyof PartyAddressDraft]}
                    onChange={(e) =>
                      updateAddressRow(
                        idx,
                        f as keyof PartyAddressDraft,
                        e.target.checked,
                      )
                    }
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 dark:border-slate-700"
                  />
                  {f.replace("is_", "")}
                </label>
              ))}
            </div>
          </div>
        </div>
      ))} */
