// components/parties/tabs/AddressesTab.tsx

"use client";

import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type { PartyAddressDraft } from "@/types/erp";
import MasterDropdown from "@/app/components/common/MasterDropdown";
import { Button } from "@/components/ui/button";

type Props = {
  addresses: PartyAddressDraft[];
  setAddresses: React.Dispatch<React.SetStateAction<PartyAddressDraft[]>>;
  isReadonly?: boolean;
  errors: Record<string, string>;
  onRequestEdit?: () => void;
  onSave?: () => void;
};

function formatMapQuery(addr: PartyAddressDraft): string {
  return encodeURIComponent(
    [addr.address_1, addr.address_2, addr.city, addr.state, addr.postcode, addr.country]
      .filter(Boolean)
      .join(", "),
  );
}

function getLocationIcon(label?: string): string {
  const lower = (label || "").toLowerCase();
  if (lower.includes("warehouse") || lower.includes("distribution")) {
    return "tabler:building-warehouse";
  }
  if (lower.includes("delivery") || lower.includes("shipping")) {
    return "tabler:truck-delivery";
  }
  return "tabler:map-pin";
}

function getLocationTypeBadge(addr: PartyAddressDraft): {
  text: string;
  className: string;
} {
  const lower = (addr.label || "").toLowerCase();
  if (lower.includes("head") || lower.includes("office")) {
    return {
      text: "Office",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60",
    };
  }
  if (lower.includes("warehouse") || lower.includes("distribution")) {
    return {
      text: "Warehouse",
      className:
        "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800/60",
    };
  }
  if (lower.includes("delivery") || lower.includes("shipping")) {
    return {
      text: "Delivery",
      className:
        "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60",
    };
  }
  if (addr.is_billing) {
    return {
      text: "Billing",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60",
    };
  }
  if (addr.is_shipping) {
    return {
      text: "Shipping",
      className:
        "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60",
    };
  }
  return {
    text: "Location",
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };
}

export default function AddressesTab({
  addresses,
  setAddresses,
  isReadonly = false,
  errors,
  onRequestEdit,
  onSave,
}: Props) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addAddressRow = () => {
    onRequestEdit?.();
    const nextIdx = addresses.length;
    setAddresses((prev) => [
      ...prev,
      {
        label: "",
        address_1: "",
        address_2: "",
        city: "",
        state: "",
        postcode: "",
        country: "UK",
        phone: "",
        email: "",
        is_primary: prev.length === 0,
        is_billing: true,
        is_shipping: true,
        is_collection: false,
      },
    ]);
    setEditingIndex(nextIdx);
  };

  const updateAddressRow = (
    idx: number,
    key: keyof PartyAddressDraft,
    val: string | boolean,
  ) => {
    setAddresses((prev) =>
      prev.map((a, i) => {
        if (key === "is_primary" && val === true) {
          return { ...a, is_primary: i === idx };
        }
        return i === idx ? { ...a, [key]: val } : a;
      }),
    );
  };

  const handleSetPrimary = (idx: number) => {
    if (isReadonly) return;
    onRequestEdit?.();
    setAddresses((prev) =>
      prev.map((a, i) => ({
        ...a,
        is_primary: i === idx,
      })),
    );
  };

  const handleDeleteAddress = (idx: number) => {
    if (isReadonly) return;
    onRequestEdit?.();
    setAddresses((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      if (filtered.length > 0 && !filtered.some((a) => a.is_primary)) {
        filtered[0] = { ...filtered[0], is_primary: true };
      }
      return filtered;
    });
    if (editingIndex === idx) {
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > idx) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const getInputClass = (errorKey: string, disabled: boolean = isReadonly) => {
    const baseClasses =
      "w-full border px-2.5 py-1.5 rounded-lg text-sm outline-none transition-colors duration-150";

    if (disabled) {
      return `${baseClasses} bg-slate-100/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 cursor-not-allowed select-none`;
    }

    const stateClasses = errors[errorKey]
      ? "border-red-500 bg-red-50/20 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-600 dark:focus:ring-emerald-500";

    return `${baseClasses} ${stateClasses}`;
  };

  const filteredAddresses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return addresses
      .map((addr, originalIndex) => ({ addr, originalIndex }))
      .filter(({ addr }) => {
        if (!q) return true;
        return (
          (addr.label || "").toLowerCase().includes(q) ||
          (addr.address_1 || "").toLowerCase().includes(q) ||
          (addr.address_2 || "").toLowerCase().includes(q) ||
          (addr.city || "").toLowerCase().includes(q) ||
          (addr.state || "").toLowerCase().includes(q) ||
          (addr.postcode || "").toLowerCase().includes(q) ||
          (addr.country || "").toLowerCase().includes(q) ||
          (addr.phone || "").toLowerCase().includes(q) ||
          (addr.email || "").toLowerCase().includes(q)
        );
      });
  }, [addresses, searchQuery]);

  const activeEditAddress =
    editingIndex !== null && addresses[editingIndex]
      ? addresses[editingIndex]
      : null;

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon
            icon="tabler:map-pin"
            className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
          />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Locations
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 tabular-nums">
            {addresses.length} {addresses.length === 1 ? "Location" : "Locations"}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-56">
            <Icon
              icon="tabler:search"
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search locations..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161D] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-600 dark:focus:ring-emerald-500 transition-colors"
            />
          </div>

          <Button
            type="button"
            onClick={addAddressRow}
            variant="add_line"
            className="rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-1.5 inline-flex items-center gap-1.5 shrink-0"
          >
            <Icon icon="tabler:plus" className="w-3.5 h-3.5" />
            <span>Add Location</span>
          </Button>
        </div>
      </div>

      {/* Inline Editor Drawer when adding or editing a location */}
      {activeEditAddress && editingIndex !== null && (
        <div className="rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 bg-white dark:bg-[#11161D] p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {activeEditAddress.label
                  ? `Editing: ${activeEditAddress.label}`
                  : `New Location #${editingIndex + 1}`}
              </span>
              {activeEditAddress.is_primary && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60">
                  Primary
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setEditingIndex(null)}
              className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Done
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 items-center">
                <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  Name <span className="text-red-500">*</span>
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    placeholder="e.g. Head Office, Distribution Centre"
                    value={activeEditAddress.label}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateAddressRow(editingIndex, "label", e.target.value)
                    }
                    className={getInputClass(`addresses.${editingIndex}.label`)}
                  />
                  {errors[`addresses.${editingIndex}.label`] && (
                    <p className="text-red-500 text-[11px] mt-0.5">
                      {errors[`addresses.${editingIndex}.label`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  Address Line 1
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    value={activeEditAddress.address_1}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateAddressRow(
                        editingIndex,
                        "address_1",
                        e.target.value,
                      )
                    }
                    className={getInputClass(
                      `addresses.${editingIndex}.address_1`,
                    )}
                  />
                  {errors[`addresses.${editingIndex}.address_1`] && (
                    <p className="text-red-500 text-[11px] mt-0.5">
                      {errors[`addresses.${editingIndex}.address_1`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  Address Line 2
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    value={activeEditAddress.address_2 || ""}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateAddressRow(
                        editingIndex,
                        "address_2",
                        e.target.value,
                      )
                    }
                    className={getInputClass(
                      `addresses.${editingIndex}.address_2`,
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  City
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    value={activeEditAddress.city || ""}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateAddressRow(editingIndex, "city", e.target.value)
                    }
                    className={getInputClass(`addresses.${editingIndex}.city`)}
                  />
                  {errors[`addresses.${editingIndex}.city`] && (
                    <p className="text-red-500 text-[11px] mt-0.5">
                      {errors[`addresses.${editingIndex}.city`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  County
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    value={activeEditAddress.state || ""}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateAddressRow(editingIndex, "state", e.target.value)
                    }
                    className={getInputClass(`addresses.${editingIndex}.state`)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 items-center">
                <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  Postcode
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    value={activeEditAddress.postcode || ""}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateAddressRow(
                        editingIndex,
                        "postcode",
                        e.target.value,
                      )
                    }
                    className={getInputClass(
                      `addresses.${editingIndex}.postcode`,
                    )}
                  />
                  {errors[`addresses.${editingIndex}.postcode`] && (
                    <p className="text-red-500 text-[11px] mt-0.5">
                      {errors[`addresses.${editingIndex}.postcode`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  Country
                </label>
                <div className="col-span-8">
                  <MasterDropdown
                    type="Country"
                    value={activeEditAddress.country || "UK"}
                    displayFormat="name"
                    valueKey="code"
                    onChange={(val) =>
                      updateAddressRow(editingIndex, "country", val ?? "")
                    }
                    disabled={isReadonly}
                    defaultFilter={(item) =>
                      item.code === "UK" || item.country_id === 225
                    }
                  />
                  {errors[`addresses.${editingIndex}.country`] && (
                    <p className="text-red-500 text-[11px] mt-0.5">
                      {errors[`addresses.${editingIndex}.country`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  Telephone
                </label>
                <div className="col-span-8">
                  <input
                    type="text"
                    value={activeEditAddress.phone || ""}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateAddressRow(editingIndex, "phone", e.target.value)
                    }
                    className={`${getInputClass(
                      `addresses.${editingIndex}.phone`,
                    )} tabular-nums`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  Email
                </label>
                <div className="col-span-8">
                  <input
                    type="email"
                    value={activeEditAddress.email || ""}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateAddressRow(editingIndex, "email", e.target.value)
                    }
                    className={getInputClass(`addresses.${editingIndex}.email`)}
                  />
                  {errors[`addresses.${editingIndex}.email`] && (
                    <p className="text-red-500 text-[11px] mt-0.5">
                      {errors[`addresses.${editingIndex}.email`]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center pt-1">
                <label className="col-span-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  Location Type
                </label>
                <div className="col-span-8 flex flex-wrap gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!activeEditAddress.is_primary}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateAddressRow(
                          editingIndex,
                          "is_primary",
                          e.target.checked,
                        )
                      }
                      className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
                    />
                    Primary
                  </label>

                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!activeEditAddress.is_billing}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateAddressRow(
                          editingIndex,
                          "is_billing",
                          e.target.checked,
                        )
                      }
                      className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
                    />
                    Billing
                  </label>

                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!activeEditAddress.is_shipping}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateAddressRow(
                          editingIndex,
                          "is_shipping",
                          e.target.checked,
                        )
                      }
                      className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
                    />
                    Shipping
                  </label>

                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!activeEditAddress.is_collection}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateAddressRow(
                          editingIndex,
                          "is_collection",
                          e.target.checked,
                        )
                      }
                      className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
                    />
                    Collection
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty / Filter States */}
      {addresses.length === 0 ? (
        <div className="p-8 text-center text-sm rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#11161D]/50 text-slate-400">
          No location profiles registered.
        </div>
      ) : filteredAddresses.length === 0 ? (
        <div className="p-8 text-center text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161D] text-slate-400">
          No locations match &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : (
        /* Locations Table Card */
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#11161D] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
                  <th className="py-2.5 px-4">Location Name</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Address</th>
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-4 text-center">Primary</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {filteredAddresses.map(({ addr: a, originalIndex: idx }) => {
                  const badge = getLocationTypeBadge(a);
                  const cityPostcode = [a.city, a.postcode]
                    .filter(Boolean)
                    .join(", ");
                  const hasMapData = Boolean(
                    a.address_1 || a.city || a.postcode,
                  );
                  const hasRowError = Object.keys(errors).some((k) =>
                    k.startsWith(`addresses.${idx}.`),
                  );

                  return (
                    <tr
                      key={idx}
                      className={`align-top transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                        hasRowError ? "bg-red-50/20 dark:bg-red-950/10" : ""
                      }`}
                    >
                      {/* Location Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Icon
                            icon={getLocationIcon(a.label)}
                            className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {a.label || (
                                <span className="italic text-slate-400 font-normal">
                                  Location {idx + 1}
                                </span>
                              )}
                            </p>
                            {errors[`addresses.${idx}.label`] && (
                              <p className="text-[11px] text-red-500">
                                {errors[`addresses.${idx}.label`]}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${badge.className}`}
                        >
                          {badge.text}
                        </span>
                      </td>

                      {/* Address + View on Map */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <div className="space-y-0.5 leading-5">
                          {a.address_1 && (
                            <p className="flex items-start gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                              <Icon
                                icon="tabler:map-pin"
                                className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5"
                              />
                              <span>
                                {[a.address_1, cityPostcode]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            </p>
                          )}
                          {a.address_2 && (
                            <p className="pl-5 text-slate-600 dark:text-slate-400">
                              {a.address_2}
                            </p>
                          )}
                          {a.country && (
                            <p className="pl-5 text-slate-600 dark:text-slate-400">
                              {a.country}
                            </p>
                          )}
                          {hasMapData && (
                            <div className="pl-5 pt-0.5">
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${formatMapQuery(
                                  a,
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                              >
                                <span>View on Map</span>
                                <Icon
                                  icon="tabler:external-link"
                                  className="w-3 h-3"
                                />
                              </a>
                            </div>
                          )}
                          {!hasMapData && !a.country && (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Contact (Phone & Email) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1 text-slate-700 dark:text-slate-300">
                          {a.phone && (
                            <div className="flex items-center gap-1.5 tabular-nums">
                              <Icon
                                icon="tabler:phone"
                                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                              />
                              <span>{a.phone}</span>
                            </div>
                          )}
                          {a.email && (
                            <div className="flex items-center gap-1.5">
                              <Icon
                                icon="tabler:mail"
                                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                              />
                              <span>{a.email}</span>
                            </div>
                          )}
                          {!a.phone && !a.email && (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Primary Radio */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="radio"
                          name="primaryLocationRadio"
                          aria-label={`Mark ${
                            a.label || `Location ${idx + 1}`
                          } as primary`}
                          checked={!!a.is_primary}
                          disabled={isReadonly}
                          onChange={() => handleSetPrimary(idx)}
                          className={`w-4 h-4 accent-emerald-600 ${
                            isReadonly
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer"
                          }`}
                        />
                      </td>

                      {/* Edit & Delete Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onRequestEdit?.();
                              setEditingIndex(editingIndex === idx ? null : idx);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Location"
                          >
                            <Icon icon="tabler:pencil" className="w-4 h-4" />
                          </button>

                          {!isReadonly && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(idx)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              title="Delete Location"
                            >
                              <Icon icon="tabler:trash" className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Optional Footer Edit / Save Bar */}
      {(onRequestEdit || onSave) && (
        <div className="flex items-center justify-end gap-2.5 pt-1">
          {onRequestEdit && (
            <button
              type="button"
              onClick={onRequestEdit}
              className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161D] hover:bg-slate-50 dark:hover:bg-slate-800/70 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              Edit
            </button>
          )}
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-sm font-semibold text-white transition-colors"
            >
              Save
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* "use client";

import type { PartyAddressDraft } from "@/types/erp";
import MasterDropdown from "@/app/components/common/MasterDropdown";
import { Button } from "@/components/ui/button";

type Props = {
  addresses: PartyAddressDraft[];
  setAddresses: React.Dispatch<React.SetStateAction<PartyAddressDraft[]>>;
  isReadonly?: boolean;
  errors: Record<string, string>;
  onRequestEdit?: () => void;
};

export default function AddressesTab({
  addresses,
  setAddresses,
  isReadonly = false,
  errors,
  onRequestEdit,
}: Props) {
  const addAddressRow = () => {

    onRequestEdit?.();
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
      "w-full border p-2 rounded text-sm outline-none transition-colors duration-150";

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
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wider">
          Locations
        </h3>

     
          <Button type="button" onClick={addAddressRow} variant="add_line" >
            Add Location
          </Button>

      </div>

      {addresses.length === 0 && (
        <div className="p-8 text-center text-sm border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400">
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
              <span className="font-semibold text-sm">Location {idx + 1}</span>

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
                <label className="text-sm font-medium">
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
                <label className="text-sm font-medium">Address Line 1</label>
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
                <label className="text-sm font-medium">Address Line 2</label>

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
                <label className="text-sm font-medium">City</label>
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
                <label className="text-sm font-medium">County</label>
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
                <label className="text-sm font-medium">Postcode</label>

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
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Country
                </label>

                <div className="col-span-2">
                  <MasterDropdown
                    type="Country"
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
                <label className="text-sm font-medium">Telephone</label>

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
                <label className="text-sm font-medium">Email</label>

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
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Location Type
                </label>
                <div className="col-span-2">
                  <div className="flex flex-wrap gap-4 text-sm font-medium p-2 mb-1">
                    <label className="flex items-center gap-2 text-sm">
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

                    <label className="flex items-center gap-2 text-sm">
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

                    <label className="flex items-center gap-2 text-sm">
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

                    <label className="flex items-center gap-2 text-sm">
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
} */
