// components/parties/tabs/AddressesTab.tsx

"use client";

import type { PartyAddressDraft } from "@/types/erp";

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
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Geographic Operational Addresses
        </h3>
        <button
          type="button"
          onClick={addAddressRow}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          + Append Location Node
        </button>
      </div>

      {addresses.length === 0 && (
        <div className="p-8 text-center text-sm border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400">
          No location profiles registered.
        </div>
      )}

      <div className="space-y-4">
        {addresses.map((a, idx) => (
          <div
            key={idx}
            className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl relative grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <button
              type="button"
              onClick={() =>
                setAddresses(addresses.filter((_, i) => i !== idx))
              }
              className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors text-base"
            >
              ✕
            </button>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Location Label *
              </label>
              <input
                type="text"
                value={a.label}
                placeholder="e.g. Headquarters, Logistics Hub"
                onChange={(e) => updateAddressRow(idx, "label", e.target.value)}
                className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 ${errors[`addresses.${idx}.label`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`addresses.${idx}.label`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`addresses.${idx}.label`]}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Street Line 1 *
              </label>
              <input
                type="text"
                value={a.address_1}
                onChange={(e) =>
                  updateAddressRow(idx, "address_1", e.target.value)
                }
                className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 ${errors[`addresses.${idx}.address_1`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`addresses.${idx}.address_1`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`addresses.${idx}.address_1`]}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Street Line 2 (Optional)
              </label>
              <input
                type="text"
                value={a.address_2 || ""}
                onChange={(e) =>
                  updateAddressRow(idx, "address_2", e.target.value)
                }
                className="w-full border p-2 rounded-lg text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                City *
              </label>
              <input
                type="text"
                value={a.city || ""}
                onChange={(e) => updateAddressRow(idx, "city", e.target.value)}
                className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 ${errors[`addresses.${idx}.city`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`addresses.${idx}.city`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`addresses.${idx}.city`]}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                State / Province
              </label>
              <input
                type="text"
                value={a.state || ""}
                onChange={(e) => updateAddressRow(idx, "state", e.target.value)}
                className="w-full border p-2 rounded-lg text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Postcode *
              </label>
              <input
                type="text"
                value={a.postcode || ""}
                onChange={(e) =>
                  updateAddressRow(idx, "postcode", e.target.value)
                }
                className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 ${errors[`addresses.${idx}.postcode`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`addresses.${idx}.postcode`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`addresses.${idx}.postcode`]}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Country ISO Code *
              </label>
              <input
                type="text"
                value={a.country || ""}
                placeholder="e.g. US, GB"
                onChange={(e) =>
                  updateAddressRow(idx, "country", e.target.value)
                }
                className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 ${errors[`addresses.${idx}.country`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`addresses.${idx}.country`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`addresses.${idx}.country`]}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Location Phone
              </label>
              <input
                type="text"
                value={a.phone || ""}
                onChange={(e) => updateAddressRow(idx, "phone", e.target.value)}
                className="w-full border p-2 rounded-lg text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Location Email Notifications
              </label>
              <input
                type="email"
                value={a.email || ""}
                onChange={(e) => updateAddressRow(idx, "email", e.target.value)}
                className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 ${errors[`addresses.${idx}.email`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`addresses.${idx}.email`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`addresses.${idx}.email`]}
                </p>
              )}
            </div>

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
                  {f.replace("is_", "")} Destination Node
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* "use client";

import type { PartyAddressDraft } from "@/types/erp";

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
        city: "",
        county: "",
        postcode: "",
        country_id: "",
        is_primary: addresses.length === 0,
        is_billing: true,
        is_shipping: true,
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
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Geographic Operational Addresses
        </h3>
        <button
          type="button"
          onClick={addAddressRow}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          + Append Location Node
        </button>
      </div>

      {addresses.length === 0 && (
        <div className="p-8 text-center text-sm border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400">
          No location profiles registered.
        </div>
      )}

      <div className="space-y-4">
        {addresses.map((a, idx) => (
          <div
            key={idx}
            className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl relative grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <button
              type="button"
              onClick={() =>
                setAddresses(addresses.filter((_, i) => i !== idx))
              }
              className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors text-base"
            >
              ✕
            </button>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Location Label *
              </label>
              <input
                type="text"
                value={a.label}
                placeholder="e.g. Headquarters, Logistics Hub"
                onChange={(e) => updateAddressRow(idx, "label", e.target.value)}
                className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${
                  errors[`addresses.${idx}.label`]
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Street Line 1 *
              </label>
              <input
                type="text"
                value={a.address_1}
                onChange={(e) =>
                  updateAddressRow(idx, "address_1", e.target.value)
                }
                className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${
                  errors[`addresses.${idx}.address_1`]
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                City *
              </label>
              <input
                type="text"
                value={a.city || ""}
                onChange={(e) => updateAddressRow(idx, "city", e.target.value)}
                className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${
                  errors[`addresses.${idx}.city`]
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Postcode *
              </label>
              <input
                type="text"
                value={a.postcode || ""}
                onChange={(e) =>
                  updateAddressRow(idx, "postcode", e.target.value)
                }
                className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${
                  errors[`addresses.${idx}.postcode`]
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Country ISO Code *
              </label>
              <input
                type="text"
                value={a.country_id || ""}
                placeholder="e.g. US, GB"
                onChange={(e) =>
                  updateAddressRow(idx, "country_id", e.target.value)
                }
                className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${
                  errors[`addresses.${idx}.country_id`]
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
            </div>

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
                  {f.replace("is_", "")} Destination Node
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} */
