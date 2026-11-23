// app/components/crm/prospects/components/ProspectAddressLocations.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type { ProspectAddress } from "@/types/prospect";
import MasterDropdown from "@/app/components/common/MasterDropdown";
import { useMaster, type MasterItem } from "@/lib/hooks/useMaster";

type Props = {
  addresses: ProspectAddress[];
  onChange: (addresses: ProspectAddress[]) => void;
  /** View mode: no adding, editing or deleting. */
  readOnly?: boolean;
};

type AddressFields = Pick<
  ProspectAddress,
  "address_1" | "address_2" | "city" | "state" | "postcode" | "country"
>;

/* ============================================================
   STYLES
============================================================ */

const cellInputClass =
  "h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const modalInputClass =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ============================================================
   HELPERS
============================================================ */

function createAddress(isFirst: boolean): ProspectAddress {
  return {
    label: isFirst ? "Head Office" : "",
    address_1: null,
    address_2: null,
    city: null,
    state: null,
    country: "UK",
    postcode: null,
    phone: null,
    email: null,
    is_primary: isFirst,
    is_billing: isFirst,
    is_shipping: isFirst,
  };
}

function getLocationIcon(label?: string | null): string {
  const lower = (label || "").toLowerCase();

  if (lower.includes("warehouse") || lower.includes("distribution")) {
    return "tabler:building-warehouse";
  }

  if (lower.includes("delivery") || lower.includes("shipping")) {
    return "tabler:truck-delivery";
  }

  return "tabler:map-pin";
}

function hasAddressDetails(address: AddressFields): boolean {
  return Boolean(
    address.address_1?.trim() ||
      address.city?.trim() ||
      address.postcode?.trim(),
  );
}

function formatMapQuery(address: AddressFields, countryName: string): string {
  return encodeURIComponent(
    [
      address.address_1,
      address.address_2,
      address.city,
      address.state,
      address.postcode,
      countryName,
    ]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", "),
  );
}

function nullIfEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/* ============================================================
   ADDRESS DISPLAY (shared by view + edit rows)
============================================================ */

function AddressSummary({
  address,
  countryName,
}: {
  address: AddressFields;
  countryName: string;
}) {
  const firstLine = [address.address_1, address.address_2]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  const secondLine = [address.city, address.state, address.postcode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex items-start gap-1.5 leading-5">
      <Icon
        icon="tabler:map-pin"
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700"
      />
      <div className="text-slate-800">
        {firstLine && <p className="font-medium text-black">{firstLine},</p>}
        {(secondLine || countryName) && (
          <p>{[secondLine, countryName].filter(Boolean).join(", ")}</p>
        )}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${formatMapQuery(
            address,
            countryName,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
        >
          View on Map
          <Icon icon="tabler:external-link" className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

/* ============================================================
   COMPONENT
============================================================ */

export default function ProspectAddressLocations({
  addresses,
  onChange,
  readOnly = false,
}: Props) {
  const countries = useMaster("Country");

  const [search, setSearch] = useState("");

  /* Inline row editing */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [rowDraft, setRowDraft] = useState<ProspectAddress | null>(null);
  const [isNewRow, setIsNewRow] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  /* Address modal */
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressFields | null>(null);

  /* Delete confirmation */
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(
    null,
  );

  const isEditing = editingIndex !== null;

  const getCountryName = (code: string | null | undefined): string => {
    if (!code) return "";
    const match = countries.find(
      (item: MasterItem) =>
        String(item.code ?? item.id) === code || String(item.id) === code,
    );
    return match?.name ?? code;
  };

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = addresses.map((address, index) => ({ address, index }));

    if (!term) return rows;

    return rows.filter(
      ({ address, index }) =>
        index === editingIndex ||
        [
          address.label,
          address.address_1,
          address.address_2,
          address.city,
          address.state,
          address.country,
          address.postcode,
          address.phone,
          address.email,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [addresses, search, editingIndex]);

  /* ---------------- Row editing ---------------- */

  const startEdit = (index: number, openAddress = false) => {
    if (isEditing) return;

    const draft = { ...addresses[index] };
    setRowDraft(draft);
    setEditingIndex(index);
    setIsNewRow(false);
    setRowError(null);
    setConfirmDeleteIndex(null);

    if (openAddress) openAddressModal(draft);
  };

  const addRow = () => {
    if (isEditing) return;

    const draft = createAddress(addresses.length === 0);

    onChange([...addresses, draft]);
    setRowDraft(draft);
    setEditingIndex(addresses.length);
    setIsNewRow(true);
    setRowError(null);
    setSearch("");
  };

  const cancelEdit = () => {
    if (isNewRow && editingIndex !== null) {
      onChange(addresses.filter((_, i) => i !== editingIndex));
    }

    setEditingIndex(null);
    setRowDraft(null);
    setIsNewRow(false);
    setRowError(null);
  };

  const updateRowDraft = <K extends keyof ProspectAddress>(
    field: K,
    value: ProspectAddress[K],
  ) => {
    setRowDraft((current) =>
      current ? { ...current, [field]: value } : current,
    );
  };

  const saveRow = () => {
    if (editingIndex === null || !rowDraft) return;

    if (!rowDraft.label.trim()) {
      setRowError("Location name is required.");
      return;
    }

    if (!hasAddressDetails(rowDraft)) {
      setRowError("Please add the address details.");
      return;
    }

    if (rowDraft.email?.trim() && !EMAIL_REGEX.test(rowDraft.email.trim())) {
      setRowError("Enter a valid email address.");
      return;
    }

    const cleaned: ProspectAddress = {
      ...rowDraft,
      label: rowDraft.label.trim(),
      phone: nullIfEmpty(rowDraft.phone),
      email: nullIfEmpty(rowDraft.email),
    };

    let next = addresses.map((address, i) =>
      i === editingIndex ? cleaned : address,
    );

    if (cleaned.is_primary) {
      next = next.map((address, i) => ({
        ...address,
        is_primary: i === editingIndex,
      }));
    } else if (!next.some((address) => address.is_primary)) {
      next[0] = { ...next[0], is_primary: true };
    }

    onChange(next);
    setEditingIndex(null);
    setRowDraft(null);
    setIsNewRow(false);
    setRowError(null);
  };

  /* ---------------- View-mode actions ---------------- */

  const setPrimary = (index: number) => {
    onChange(
      addresses.map((address, i) => ({
        ...address,
        is_primary: i === index,
      })),
    );
  };

  const removeAddress = (index: number) => {
    const wasPrimary = addresses[index]?.is_primary;
    const remaining = addresses.filter((_, i) => i !== index);

    if (wasPrimary && remaining.length) {
      remaining[0] = { ...remaining[0], is_primary: true };
    }

    setConfirmDeleteIndex(null);
    onChange(remaining);
  };

  /* ---------------- Address modal ---------------- */

  const openAddressModal = (source: ProspectAddress | null = rowDraft) => {
    if (!source) return;

    setAddressDraft({
      address_1: source.address_1,
      address_2: source.address_2,
      city: source.city,
      state: source.state,
      postcode: source.postcode,
      country: source.country || "UK",
    });
    setAddressModalOpen(true);
  };

  const closeAddressModal = () => {
    setAddressModalOpen(false);
    setAddressDraft(null);
  };

  const applyAddress = () => {
    if (!addressDraft) return;

    setRowDraft((current) =>
      current
        ? {
            ...current,
            address_1: nullIfEmpty(addressDraft.address_1),
            address_2: nullIfEmpty(addressDraft.address_2),
            city: nullIfEmpty(addressDraft.city),
            state: nullIfEmpty(addressDraft.state),
            postcode: nullIfEmpty(addressDraft.postcode),
            country: nullIfEmpty(addressDraft.country),
          }
        : current,
    );
    setRowError(null);
    closeAddressModal();
  };

  const updateAddressDraft = (field: keyof AddressFields, value: string) => {
    setAddressDraft((current) =>
      current ? { ...current, [field]: value } : current,
    );
  };

  /* Form switched to view mode: drop any open row edit. */
  useEffect(() => {
    if (!readOnly) return;
    setEditingIndex(null);
    setRowDraft(null);
    setIsNewRow(false);
    setRowError(null);
    setConfirmDeleteIndex(null);
    setAddressModalOpen(false);
    setAddressDraft(null);
  }, [readOnly]);

  useEffect(() => {
    if (!addressModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAddressModalOpen(false);
        setAddressDraft(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addressModalOpen]);

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Icon icon="tabler:map-pin" className="text-xl text-slate-800" />
            Locations
          </h2>

          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
            {addresses.length}{" "}
            {addresses.length === 1 ? "Location" : "Locations"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Icon
              icon="tabler:search"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search locations..."
              className="h-9 w-56 rounded-lg border border-slate-300 pl-8 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {!readOnly && (
          <button
            type="button"
            onClick={addRow}
            disabled={isEditing}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-800 px-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon icon="tabler:plus" />
            Add Location
          </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="bg-emerald-50/60 text-slate-900">
              <th className="w-[22%] px-4 py-2.5 font-semibold">
                Location Name
              </th>
              <th className="w-[34%] px-3 py-2.5 font-semibold">Address</th>
              <th className="w-[26%] px-3 py-2.5 font-semibold">Contact</th>
              <th className="px-3 py-2.5 text-center font-semibold">Primary</th>
              {!readOnly && (
                <th className="px-4 py-2.5 text-center font-semibold">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredRows.map(({ address: savedAddress, index }) => {
              const editing = index === editingIndex && rowDraft !== null;
              const address = editing ? rowDraft : savedAddress;
              const countryName = getCountryName(address.country);
              const hasDetails = hasAddressDetails(address);

              /* ---------------- EDIT ROW ---------------- */
              if (editing) {
                return (
                  <tr
                    key={savedAddress.id || `address-${index}`}
                    className="bg-emerald-50/30 align-top"
                  >
                    {/* NAME + FLAGS */}
                    <td className="px-4 py-3">
                      <input
                        autoFocus={!address.label}
                        value={address.label}
                        onChange={(event) =>
                          updateRowDraft("label", event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveRow();
                          if (event.key === "Escape") cancelEdit();
                        }}
                        placeholder="Location name"
                        className={cellInputClass}
                      />

                      <div className="mt-2 flex flex-wrap gap-3">
                        {[
                          { field: "is_billing" as const, label: "Billing" },
                          { field: "is_shipping" as const, label: "Shipping" },
                        ].map((option) => (
                          <label
                            key={option.field}
                            className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(address[option.field])}
                              onChange={(event) =>
                                updateRowDraft(
                                  option.field,
                                  event.target.checked,
                                )
                              }
                              className="h-3.5 w-3.5 accent-emerald-700"
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </td>

                    {/* ADDRESS (modal) */}
                    <td className="px-3 py-3">
                      {hasDetails ? (
                        <div className="flex items-start justify-between gap-2">
                          <AddressSummary
                            address={address}
                            countryName={countryName}
                          />
                          <button
                            type="button"
                            onClick={() => openAddressModal()}
                            title="Edit address"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
                          >
                            <Icon icon="tabler:edit" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAddressModal()}
                          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-emerald-600 bg-white text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          <Icon icon="tabler:map-pin-plus" />
                          Add address
                        </button>
                      )}

                      {rowError && (
                        <p className="mt-1.5 text-[11px] text-red-600">
                          {rowError}
                        </p>
                      )}
                    </td>

                    {/* CONTACT */}
                    <td className="space-y-1.5 px-3 py-3">
                      <div className="relative">
                        <Icon
                          icon="tabler:phone"
                          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          value={address.phone || ""}
                          onChange={(event) =>
                            updateRowDraft("phone", event.target.value)
                          }
                          placeholder="Telephone"
                          className={`${cellInputClass} pl-7 tabular-nums`}
                        />
                      </div>
                      <div className="relative">
                        <Icon
                          icon="tabler:mail"
                          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="email"
                          value={address.email || ""}
                          onChange={(event) =>
                            updateRowDraft("email", event.target.value)
                          }
                          placeholder="Email"
                          className={`${cellInputClass} pl-7`}
                        />
                      </div>
                    </td>

                    {/* PRIMARY */}
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={address.is_primary}
                        onChange={(event) =>
                          updateRowDraft("is_primary", event.target.checked)
                        }
                        title="Primary location"
                        className="mt-2 h-4 w-4 cursor-pointer accent-emerald-700"
                      />
                    </td>

                    {/* SAVE / CANCEL */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={saveRow}
                          title="Save row"
                          className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-700 text-white hover:bg-emerald-800"
                        >
                          <Icon icon="tabler:check" className="text-lg" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          title="Cancel"
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        >
                          <Icon icon="tabler:x" className="text-lg" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              /* ---------------- VIEW ROW ---------------- */
              return (
                <tr
                  key={savedAddress.id || `address-${index}`}
                  className="align-top hover:bg-slate-50/60"
                >
                  {/* NAME */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <Icon
                        icon={getLocationIcon(address.label)}
                        className="h-4 w-4 shrink-0 text-black"
                      />
                      <span>
                        {address.label || (
                          <span className="font-normal italic text-slate-400">
                            Location {index + 1}
                          </span>
                        )}
                      </span>
                    </div>
                    {(address.is_billing || address.is_shipping) && (
                      <div className="mt-1 flex gap-1 pl-6 text-[11px] text-slate-500">
                        {[
                          address.is_billing && "Billing",
                          address.is_shipping && "Shipping",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </td>

                  {/* ADDRESS */}
                  <td className="px-3 py-3">
                    {hasDetails ? (
                      <AddressSummary
                        address={address}
                        countryName={countryName}
                      />
                    ) : (
                      readOnly ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(index, true)}
                        disabled={isEditing}
                        className="text-xs font-medium text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        + Add address
                      </button>
                      )
                    )}
                  </td>

                  {/* CONTACT */}
                  <td className="px-3 py-3">
                    <div className="space-y-1 text-slate-800">
                      {address.phone && (
                        <div className="flex items-center gap-1.5 tabular-nums">
                          <Icon
                            icon="tabler:phone"
                            className="h-3.5 w-3.5 shrink-0 text-slate-500"
                          />
                          {address.phone}
                        </div>
                      )}
                      {address.email && (
                        <div className="flex items-center gap-1.5">
                          <Icon
                            icon="tabler:mail"
                            className="h-3.5 w-3.5 shrink-0 text-slate-500"
                          />
                          <span className="break-all">{address.email}</span>
                        </div>
                      )}
                      {!address.phone && !address.email && (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </td>

                  {/* PRIMARY */}
                  <td className="px-3 py-3 text-center">
                    <input
                      type="radio"
                      name="prospect-primary-location"
                      checked={address.is_primary}
                      onChange={() => setPrimary(index)}
                      disabled={isEditing || readOnly}
                      title="Set as primary location"
                      className="h-4 w-4 cursor-pointer accent-emerald-700 disabled:cursor-not-allowed"
                    />
                  </td>

                  {/* ACTIONS */}
                  {!readOnly && (
                  <td className="px-4 py-3">
                    {confirmDeleteIndex === index ? (
                      <div className="flex items-center justify-center gap-1 text-xs">
                        <span className="text-slate-600">Delete?</span>
                        <button
                          type="button"
                          onClick={() => removeAddress(index)}
                          className="rounded px-1.5 py-0.5 font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteIndex(null)}
                          className="rounded px-1.5 py-0.5 font-medium text-slate-600 hover:bg-slate-100"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(index)}
                          disabled={isEditing}
                          title="Edit row"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Icon icon="tabler:pencil" className="text-lg" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteIndex(index)}
                          disabled={isEditing}
                          title="Delete location"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-800 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Icon icon="tabler:trash" className="text-lg" />
                        </button>
                      </div>
                    )}
                  </td>
                  )}
                </tr>
              );
            })}

            {filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={readOnly ? 4 : 5}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  {addresses.length === 0
                    ? "No locations added yet."
                    : "No locations match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADDRESS MODAL */}
      {addressModalOpen && addressDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAddressModal();
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Icon
                  icon="tabler:map-pin"
                  className="text-xl text-emerald-700"
                />
                Address
                {rowDraft?.label && (
                  <span className="font-normal text-slate-500">
                    — {rowDraft.label}
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={closeAddressModal}
                title="Close"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              >
                <Icon icon="tabler:x" className="text-lg" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              {(
                [
                  { field: "address_1", label: "Address Line 1" },
                  { field: "address_2", label: "Address Line 2" },
                  { field: "city", label: "City" },
                  { field: "state", label: "County" },
                  { field: "postcode", label: "Postcode" },
                ] as const
              ).map((item, i) => (
                <div
                  key={item.field}
                  className="grid grid-cols-12 items-center gap-2"
                >
                  <label className="col-span-4 text-sm font-medium text-black">
                    {item.label}
                  </label>
                  <div className="col-span-8">
                    <input
                      autoFocus={i === 0}
                      value={addressDraft[item.field] || ""}
                      onChange={(event) =>
                        updateAddressDraft(item.field, event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") applyAddress();
                      }}
                      className={modalInputClass}
                    />
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-sm font-medium text-black">
                  Country
                </label>
                <div className="col-span-8">
                  <MasterDropdown
                    type="Country"
                    value={addressDraft.country || "UK"}
                    displayFormat="name"
                    valueKey="code"
                    onChange={(value) =>
                      updateAddressDraft("country", value ?? "")
                    }
                    defaultFilter={(item) =>
                      item.code === "UK" || item.country_id === 225
                    }
                    className={modalInputClass}
                  />
                </div>
              </div>

              {hasAddressDetails(addressDraft) && (
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <AddressSummary
                    address={addressDraft}
                    countryName={getCountryName(addressDraft.country)}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={closeAddressModal}
                className="h-9 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyAddress}
                className="h-9 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
