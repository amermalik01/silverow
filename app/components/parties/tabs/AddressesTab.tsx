// components/parties/tabs/AddressesTab.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type { PartyAddressDraft } from "@/types/erp";
import MasterDropdown from "@/app/components/common/MasterDropdown";
import { Button } from "@/components/ui/button";
import { useMaster, type MasterItem } from "@/lib/hooks/useMaster";

/*
 * Shared by CRM, Customer, SRM and Supplier records (PartyRecord).
 * Single-table layout with inline row editing; the address itself is
 * edited in a small modal (same pattern as the prospect Locations card).
 */

type Props = {
  addresses: PartyAddressDraft[];
  setAddresses: React.Dispatch<React.SetStateAction<PartyAddressDraft[]>>;
  isReadonly?: boolean;
  errors: Record<string, string>;
  onRequestEdit?: () => void;
  onSave?: () => void;
};

type AddressFields = Pick<
  PartyAddressDraft,
  "address_1" | "address_2" | "city" | "state" | "postcode" | "country"
>;

/* ============================================================
   STYLES
============================================================ */

const cellInputClass =
  "h-8 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-sm text-black dark:text-slate-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

const modalInputClass =
  "h-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-black dark:text-slate-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ============================================================
   HELPERS
============================================================ */

function createAddress(isFirst: boolean): PartyAddressDraft {
  return {
    label: isFirst ? "Head Office" : "",
    address_1: "",
    address_2: "",
    city: "",
    state: "",
    postcode: "",
    country: "UK",
    phone: "",
    email: "",
    is_primary: isFirst,
    is_billing: true,
    is_shipping: true,
    is_collection: false,
  };
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

/* ============================================================
   ADDRESS DISPLAY
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
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400"
      />
      <div className="text-slate-800 dark:text-slate-300">
        {firstLine && (
          <p className="font-medium text-black dark:text-slate-100">
            {firstLine},
          </p>
        )}
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
          className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
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

export default function AddressesTab({
  addresses,
  setAddresses,
  isReadonly = false,
  errors,
  onRequestEdit,
  onSave,
}: Props) {
  const countries = useMaster("Country");

  /*
   * Rows can be changed when the record is in edit mode, or when the
   * parent lets us switch it into edit mode (view page with Edit).
   */
  const canEdit = !isReadonly || Boolean(onRequestEdit);

  const [searchQuery, setSearchQuery] = useState("");

  /* Inline row editing */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [rowDraft, setRowDraft] = useState<PartyAddressDraft | null>(null);
  const [isNewRow, setIsNewRow] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  /* Address modal */
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressFields | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  /* Delete confirmation */
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(
    null,
  );

  const isEditingRow = editingIndex !== null;

  const getCountryName = (code: string | null | undefined): string => {
    if (!code) return "";
    const match = countries.find(
      (item: MasterItem) =>
        String(item.code ?? item.id) === code || String(item.id) === code,
    );
    return match?.name ?? code;
  };

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = addresses.map((addr, index) => ({ addr, index }));

    if (!q) return rows;

    return rows.filter(
      ({ addr, index }) =>
        index === editingIndex ||
        [
          addr.label,
          addr.address_1,
          addr.address_2,
          addr.city,
          addr.state,
          addr.postcode,
          addr.country,
          addr.phone,
          addr.email,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [addresses, searchQuery, editingIndex]);

  /* Record cancelled / switched back to view mode: drop open edits. */
  useEffect(() => {
    if (!isReadonly) return;
    setEditingIndex(null);
    setRowDraft(null);
    setIsNewRow(false);
    setRowError(null);
    setConfirmDeleteIndex(null);
    setAddressModalOpen(false);
    setAddressDraft(null);
  }, [isReadonly]);

  /* ---------------- Row editing ---------------- */

  const openAddressModal = (source: PartyAddressDraft | null = rowDraft) => {
    if (!source) return;

    setAddressDraft({
      address_1: source.address_1 || "",
      address_2: source.address_2 || "",
      city: source.city || "",
      state: source.state || "",
      postcode: source.postcode || "",
      country: source.country || "UK",
    });
    setAddressError(null);
    setAddressModalOpen(true);
  };

  const startEdit = (index: number, openAddress = false) => {
    if (isEditingRow || !canEdit) return;

    onRequestEdit?.();

    const draft = { ...addresses[index] };
    setRowDraft(draft);
    setEditingIndex(index);
    setIsNewRow(false);
    setRowError(null);
    setConfirmDeleteIndex(null);

    if (openAddress) openAddressModal(draft);
  };

  const addRow = () => {
    if (isEditingRow || !canEdit) return;

    onRequestEdit?.();

    const draft = createAddress(addresses.length === 0);
    const newIndex = addresses.length;

    setAddresses((prev) => [...prev, draft]);
    setRowDraft(draft);
    setEditingIndex(newIndex);
    setIsNewRow(true);
    setRowError(null);
    setSearchQuery("");
    openAddressModal(draft);
  };

  const cancelEdit = () => {
    if (isNewRow && editingIndex !== null) {
      const removeIndex = editingIndex;
      setAddresses((prev) => prev.filter((_, i) => i !== removeIndex));
    }

    setEditingIndex(null);
    setRowDraft(null);
    setIsNewRow(false);
    setRowError(null);
  };

  const updateRowDraft = <K extends keyof PartyAddressDraft>(
    field: K,
    value: PartyAddressDraft[K],
  ) => {
    setRowDraft((current) =>
      current ? { ...current, [field]: value } : current,
    );
  };

  const saveRow = () => {
    if (editingIndex === null || !rowDraft) return;

    if (!rowDraft.label?.trim()) {
      setRowError("Location name is required.");
      return;
    }

    if (
      !rowDraft.address_1?.trim() ||
      !rowDraft.city?.trim() ||
      !rowDraft.postcode?.trim() ||
      !rowDraft.country?.trim()
    ) {
      setRowError("Please complete the address (line 1, city, postcode, country).");
      return;
    }

    if (rowDraft.email?.trim() && !EMAIL_REGEX.test(rowDraft.email.trim())) {
      setRowError("Enter a valid email address.");
      return;
    }

    const savedIndex = editingIndex;
    const cleaned: PartyAddressDraft = {
      ...rowDraft,
      label: rowDraft.label.trim(),
      phone: rowDraft.phone?.trim() || "",
      email: rowDraft.email?.trim() || "",
    };

    setAddresses((prev) => {
      let next = prev.map((addr, i) => (i === savedIndex ? cleaned : addr));

      if (cleaned.is_primary) {
        next = next.map((addr, i) => ({ ...addr, is_primary: i === savedIndex }));
      } else if (next.length && !next.some((addr) => addr.is_primary)) {
        next[0] = { ...next[0], is_primary: true };
      }

      return next;
    });

    setEditingIndex(null);
    setRowDraft(null);
    setIsNewRow(false);
    setRowError(null);
  };

  /* ---------------- View-row actions ---------------- */

  const handleSetPrimary = (index: number) => {
    if (!canEdit || isEditingRow) return;
    onRequestEdit?.();
    setAddresses((prev) =>
      prev.map((addr, i) => ({ ...addr, is_primary: i === index })),
    );
  };

  const handleDeleteAddress = (index: number) => {
    if (!canEdit) return;
    onRequestEdit?.();
    setAddresses((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length > 0 && !filtered.some((addr) => addr.is_primary)) {
        filtered[0] = { ...filtered[0], is_primary: true };
      }
      return filtered;
    });
    setConfirmDeleteIndex(null);
  };

  /* ---------------- Address modal ---------------- */

  const closeAddressModal = () => {
    setAddressModalOpen(false);
    setAddressDraft(null);
    setAddressError(null);
  };

  const applyAddress = () => {
    if (!addressDraft) return;

    if (
      !addressDraft.address_1?.trim() ||
      !addressDraft.city?.trim() ||
      !addressDraft.postcode?.trim() ||
      !addressDraft.country?.trim()
    ) {
      setAddressError("Address line 1, city, postcode and country are required.");
      return;
    }

    setRowDraft((current) =>
      current
        ? {
            ...current,
            address_1: addressDraft.address_1.trim(),
            address_2: addressDraft.address_2?.trim() || "",
            city: addressDraft.city?.trim() || "",
            state: addressDraft.state?.trim() || "",
            postcode: addressDraft.postcode?.trim() || "",
            country: addressDraft.country || "UK",
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

  const columnCount = canEdit ? 6 : 5;

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <Icon icon="tabler:map-pin" className="text-3xl text-emerald-800" />
          <h3 className="text-base font-bold text-black dark:text-slate-100">
            Locations
          </h3>
          <span className="rounded-md border border-emerald-200/70 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-400">
            {addresses.length}{" "}
            {addresses.length === 1 ? "Location" : "Locations"}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-56">
            <Icon
              icon="tabler:search"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search locations..."
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-2.5 text-sm text-black outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-700 dark:bg-[#11161D] dark:text-slate-100"
            />
          </div>

          {canEdit && (
            <Button
              type="button"
              onClick={addRow}
              disabled={isEditingRow}
              variant="add_line"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <Icon icon="tabler:plus" className="text-base" />
              <span>Add Location</span>
            </Button>
          )}
        </div>
      </div>

      {/* Locations Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800/90 dark:bg-[#11161D]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-emerald-50/60 text-xs font-semibold text-black dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                <th className="w-[20%] px-4 py-2.5">Location Name</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="w-[32%] px-4 py-2.5">Address</th>
                <th className="w-[24%] px-4 py-2.5">Contact</th>
                <th className="px-4 py-2.5 text-center">Primary</th>
                {canEdit && <th className="px-4 py-2.5 text-center">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/80">
              {filteredRows.map(({ addr: savedAddress, index }) => {
                const editing = index === editingIndex && rowDraft !== null;
                const a = editing ? rowDraft : savedAddress;
                const badge = getLocationTypeBadge(a);
                const countryName = getCountryName(a.country);
                const hasDetails = hasAddressDetails(a);
                const rowErrors = Object.entries(errors)
                  .filter(([key]) => key.startsWith(`addresses.${index}.`))
                  .map(([, message]) => message);

                /* ---------------- EDIT ROW ---------------- */
                if (editing) {
                  return (
                    <tr
                      key={savedAddress.id || `address-${index}`}
                      className="bg-emerald-50/30 align-top dark:bg-emerald-950/10"
                    >
                      {/* Name + flags */}
                      <td className="px-4 py-3">
                        <input
                          autoFocus={!a.label}
                          value={a.label || ""}
                          onChange={(e) => updateRowDraft("label", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRow();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          placeholder="e.g. Head Office"
                          className={cellInputClass}
                        />
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          {(
                            [
                              { field: "is_billing", label: "Billing" },
                              { field: "is_shipping", label: "Shipping" },
                              { field: "is_collection", label: "Collection" },
                            ] as const
                          ).map((option) => (
                            <label
                              key={option.field}
                              className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(a[option.field])}
                                onChange={(e) =>
                                  updateRowDraft(option.field, e.target.checked)
                                }
                                className="h-3.5 w-3.5 accent-emerald-700"
                              />
                              {option.label}
                            </label>
                          ))}
                        </div>
                      </td>

                      {/* Type (derived) */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
                        >
                          {badge.text}
                        </span>
                      </td>

                      {/* Address (modal) */}
                      <td className="px-4 py-3">
                        {hasDetails ? (
                          <div className="flex items-start justify-between gap-2">
                            <AddressSummary address={a} countryName={countryName} />
                            <button
                              type="button"
                              onClick={() => openAddressModal()}
                              title="Edit address"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:border-emerald-600 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                            >
                              <Icon icon="tabler:edit" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openAddressModal()}
                            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-emerald-600 bg-white text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:bg-slate-950 dark:text-emerald-400"
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

                      {/* Contact */}
                      <td className="space-y-1.5 px-4 py-3">
                        <div className="relative">
                          <Icon
                            icon="tabler:phone"
                            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            value={a.phone || ""}
                            onChange={(e) => updateRowDraft("phone", e.target.value)}
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
                            value={a.email || ""}
                            onChange={(e) => updateRowDraft("email", e.target.value)}
                            placeholder="Email"
                            className={`${cellInputClass} pl-7`}
                          />
                        </div>
                      </td>

                      {/* Primary */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(a.is_primary)}
                          onChange={(e) =>
                            updateRowDraft("is_primary", e.target.checked)
                          }
                          title="Primary location"
                          className="mt-2 h-4 w-4 cursor-pointer accent-emerald-700"
                        />
                      </td>

                      {/* Save / Cancel */}
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
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
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
                    className={`align-top transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                      rowErrors.length ? "bg-red-50/30 dark:bg-red-950/10" : ""
                    }`}
                  >
                    {/* Location Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Icon
                          icon={getLocationIcon(a.label)}
                          className="h-4 w-4 shrink-0 text-black dark:text-slate-400"
                        />
                        <p className="font-semibold text-black dark:text-slate-100">
                          {a.label || (
                            <span className="font-normal italic text-slate-400">
                              Location {index + 1}
                            </span>
                          )}
                        </p>
                      </div>
                      {(a.is_billing || a.is_shipping || a.is_collection) && (
                        <p className="mt-1 pl-6 text-[11px] text-slate-500">
                          {[
                            a.is_billing && "Billing",
                            a.is_shipping && "Shipping",
                            a.is_collection && "Collection",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {rowErrors.length > 0 && (
                        <ul className="mt-1 space-y-0.5 pl-6 text-[11px] text-red-600">
                          {rowErrors.map((message) => (
                            <li key={message}>{message}</li>
                          ))}
                        </ul>
                      )}
                    </td>

                    {/* Type */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
                      >
                        {badge.text}
                      </span>
                    </td>

                    {/* Address */}
                    <td className="px-4 py-3.5">
                      {hasDetails ? (
                        <AddressSummary address={a} countryName={countryName} />
                      ) : canEdit ? (
                        <button
                          type="button"
                          onClick={() => startEdit(index, true)}
                          disabled={isEditingRow}
                          className="text-xs font-medium text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          + Add address
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1 text-slate-700 dark:text-slate-300">
                        {a.phone && (
                          <div className="flex items-center gap-1.5 tabular-nums">
                            <Icon
                              icon="tabler:phone"
                              className="h-3.5 w-3.5 shrink-0 text-slate-500"
                            />
                            <span>{a.phone}</span>
                          </div>
                        )}
                        {a.email && (
                          <div className="flex items-center gap-1.5">
                            <Icon
                              icon="tabler:mail"
                              className="h-3.5 w-3.5 shrink-0 text-slate-500"
                            />
                            <span className="break-all">{a.email}</span>
                          </div>
                        )}
                        {!a.phone && !a.email && (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* Primary */}
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="radio"
                        name="primaryLocationRadio"
                        aria-label={`Mark ${a.label || `Location ${index + 1}`} as primary`}
                        checked={Boolean(a.is_primary)}
                        disabled={!canEdit || isEditingRow}
                        onChange={() => handleSetPrimary(index)}
                        className="h-4 w-4 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {confirmDeleteIndex === index ? (
                          <div className="flex items-center justify-center gap-1 text-xs">
                            <span className="text-slate-600 dark:text-slate-400">
                              Delete?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(index)}
                              className="rounded px-1.5 py-0.5 font-semibold text-red-600 hover:bg-red-50"
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
                              disabled={isEditingRow}
                              className="rounded-lg p-1.5 text-black transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
                              title="Edit row"
                            >
                              <Icon icon="tabler:pencil" className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteIndex(index)}
                              disabled={isEditingRow}
                              className="rounded-lg p-1.5 text-black transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-red-950/40"
                              title="Delete location"
                            >
                              <Icon icon="tabler:trash" className="h-4 w-4" />
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
                    colSpan={columnCount}
                    className="px-4 py-8 text-center text-sm text-slate-400"
                  >
                    {addresses.length === 0
                      ? "No locations added yet."
                      : `No locations match “${searchQuery}”.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optional footer: Edit in view mode, Save in edit mode */}
      {((isReadonly && onRequestEdit) || (!isReadonly && onSave)) && (
        <div className="flex items-center justify-end gap-2.5 pt-1">
          {isReadonly && onRequestEdit && (
            <button
              type="button"
              onClick={onRequestEdit}
              className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-[#11161D] dark:text-slate-200 dark:hover:bg-slate-800/70"
            >
              Edit
            </button>
          )}
          {!isReadonly && onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={isEditingRow}
              title={isEditingRow ? "Finish the row you are editing first" : undefined}
              className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              Save
            </button>
          )}
        </div>
      )}

      {/* ADDRESS MODAL */}
      {addressModalOpen && addressDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAddressModal();
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-[#11161D]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <Icon icon="tabler:map-pin" className="text-xl text-emerald-700" />
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
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Icon icon="tabler:x" className="text-lg" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              {addressError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {addressError}
                </div>
              )}

              {(
                [
                  { field: "address_1", label: "Address Line 1", required: true },
                  { field: "address_2", label: "Address Line 2", required: false },
                  { field: "city", label: "City", required: true },
                  { field: "state", label: "County", required: false },
                  { field: "postcode", label: "Postcode", required: true },
                ] as const
              ).map((item, i) => (
                <div key={item.field} className="grid grid-cols-12 items-center gap-2">
                  <label className="col-span-4 text-sm font-medium text-black dark:text-slate-400">
                    {item.label}
                    {item.required && <span className="text-red-500"> *</span>}
                  </label>
                  <div className="col-span-8">
                    <input
                      autoFocus={i === 0}
                      value={addressDraft[item.field] || ""}
                      onChange={(e) => updateAddressDraft(item.field, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") applyAddress();
                      }}
                      className={modalInputClass}
                    />
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-12 items-center gap-2">
                <label className="col-span-4 text-sm font-medium text-black dark:text-slate-400">
                  Country <span className="text-red-500">*</span>
                </label>
                <div className="col-span-8">
                  <MasterDropdown
                    type="Country"
                    value={addressDraft.country || "UK"}
                    displayFormat="name"
                    valueKey="code"
                    onChange={(val) => updateAddressDraft("country", val ?? "")}
                    defaultFilter={(item) =>
                      item.code === "UK" || item.country_id === 225
                    }
                    className={modalInputClass}
                  />
                </div>
              </div>

              {hasAddressDetails(addressDraft) && (
                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/50">
                  <AddressSummary
                    address={addressDraft}
                    countryName={getCountryName(addressDraft.country)}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
              <button
                type="button"
                onClick={closeAddressModal}
                className="h-9 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
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
      return `${baseClasses} bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-black dark:text-slate-400 cursor-not-allowed select-none ${extraClasses}`;
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
