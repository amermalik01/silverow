// components/parties/tabs/AddressesTab.tsx

"use client";

import type { PartyAddressDraft } from "@/types/erp";
import MasterDropdown from "@/app/components/common/MasterDropdown";
import { Button } from "@/components/ui/button";

type Props = {
  addresses: PartyAddressDraft[];
  setAddresses: React.Dispatch<React.SetStateAction<PartyAddressDraft[]>>;
  isReadonly?: boolean;
  errors: Record<string, string>;
};

export default function AddressesTab({
  addresses,
  setAddresses,
  isReadonly = false,
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

  const getInputClass = (
    errorKey: string,
    extraClasses: string = "",
    disabled: boolean = isReadonly,
  ) => {
    const baseClasses =
      "w-full border p-2 rounded text-xs outline-none transition-colors duration-150";

    if (disabled) {
      return `${baseClasses} bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none ${extraClasses}`;
    }

    const stateClasses = errors[errorKey]
      ? "border-red-500 bg-red-50/10 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

    return `${baseClasses} ${stateClasses} ${extraClasses}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider">
          Location(s)
        </h3>

        {!isReadonly && (
          <Button type="button" onClick={addAddressRow} variant="add_line">
            Add Location
          </Button>
        )}
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

            {!isReadonly && (
              <button
                type="button"
                onClick={() =>
                  setAddresses(addresses.filter((_, i) => i !== idx))
                }
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
              >
                ✕
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">
                  Name <span className="text-red-500">*</span>
                </label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={a.label}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateAddressRow(idx, "label", e.target.value)
                    }
                    className={getInputClass(`addresses.${idx}.label`)}
                  />
                  {errors[`addresses.${idx}.label`] && (
                    <p className="text-red-500 text-[11px] mt-0.5">
                      {errors[`addresses.${idx}.label`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">Address Line 1</label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={a.address_1}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateAddressRow(idx, "address_1", e.target.value)
                    }
                    className={getInputClass(`addresses.${idx}.address_1`)}
                  />
                  {errors[`addresses.${idx}.address_1`] && (
                    <p className="text-red-500 text-[11px] mt-0.5">
                      {errors[`addresses.${idx}.address_1`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">Address Line 2</label>

                <input
                  type="text"
                  value={a.address_2 || ""}
                  onChange={(e) =>
                    updateAddressRow(idx, "address_2", e.target.value)
                  }
                  disabled={isReadonly}
                  className={getInputClass(
                    `addresses.${idx}.address_2`,
                    "col-span-2",
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">City</label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={a.city || ""}
                    onChange={(e) =>
                      updateAddressRow(idx, "city", e.target.value)
                    }
                    disabled={isReadonly}
                    className={getInputClass(`addresses.${idx}.city`)}
                  />
                  {errors[`addresses.${idx}.city`] && (
                    <p className="text-red-500 text-[11px] mt-0.5">
                      {errors[`addresses.${idx}.city`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">State / Province</label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={a.state || ""}
                    onChange={(e) =>
                      updateAddressRow(idx, "state", e.target.value)
                    }
                    disabled={isReadonly}
                    className={getInputClass(
                      `addresses.${idx}.state`,
                      "col-span-2",
                    )}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">Postcode</label>

                <div className="col-span-2">
                  <input
                    type="text"
                    value={a.postcode || ""}
                    onChange={(e) =>
                      updateAddressRow(idx, "postcode", e.target.value)
                    }
                    disabled={isReadonly}
                    className={getInputClass(`addresses.${idx}.postcode`)}
                  />
                  {errors[`addresses.${idx}.postcode`] && (
                    <p className="text-red-500 text-[11px] mt-0.5">
                      {errors[`addresses.${idx}.postcode`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Country
                </label>

                <div className="col-span-2">
                  <MasterDropdown
                    type="country"
                    value={a.country || "UK"}
                    displayFormat="name"
                    valueKey="code"
                    onChange={(val) =>
                      updateAddressRow(idx, "country", val ?? "")
                    }
                    disabled={isReadonly}
                    defaultFilter={(item) =>
                      item.code === "UK" || item.country_id === 225
                    }
                  />
                  {errors[`addresses.${idx}.country`] && (
                    <p className="text-red-500 text-[11px] mt-0.5">
                      {errors[`addresses.${idx}.country`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium">Telephone</label>

                <input
                  type="text"
                  value={a.phone || ""}
                  onChange={(e) =>
                    updateAddressRow(idx, "phone", e.target.value)
                  }
                  disabled={isReadonly}
                  className={getInputClass(
                    `addresses.${idx}.phone`,
                    "col-span-2",
                  )}
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
                  disabled={isReadonly}
                  className={getInputClass(`addresses.${idx}.email`)}
                />

                {errors[`addresses.${idx}.email`] && (
                  <p className="text-red-500 text-[11px] mt-0.5">
                    {errors[`addresses.${idx}.email`]}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Location Type
                </label>
                <div className="col-span-2">
                  <div className="flex flex-wrap gap-4 text-xs font-medium p-2 mb-1">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={!!a.is_primary}
                        disabled={isReadonly}
                        onChange={(e) =>
                          updateAddressRow(idx, "is_primary", e.target.checked)
                        }
                        className={`w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 ${
                          isReadonly
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer"
                        }`}
                      />
                      Primary
                    </label>

                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={!!a.is_billing}
                        disabled={isReadonly}
                        onChange={(e) =>
                          updateAddressRow(idx, "is_billing", e.target.checked)
                        }
                        className={`w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 ${
                          isReadonly
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer"
                        }`}
                      />
                      Billing
                    </label>

                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={!!a.is_shipping}
                        disabled={isReadonly}
                        onChange={(e) =>
                          updateAddressRow(idx, "is_shipping", e.target.checked)
                        }
                        className={`w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 ${
                          isReadonly
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer"
                        }`}
                      />
                      Shipping
                    </label>

                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={!!a.is_collection}
                        disabled={isReadonly}
                        onChange={(e) =>
                          updateAddressRow(
                            idx,
                            "is_collection",
                            e.target.checked,
                          )
                        }
                        className={`w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 ${
                          isReadonly
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer"
                        }`}
                      />
                      Collection
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
