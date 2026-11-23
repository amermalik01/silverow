// components/parties/tabs/ContactsTab.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import type { PartyContactDraft } from "@/types/erp";

/*
 * Shared by CRM, Customer, SRM and Supplier records (PartyRecord).
 * Single-table layout with inline row editing (same pattern as Locations).
 */

type Props = {
  contacts: PartyContactDraft[];
  setContacts: React.Dispatch<React.SetStateAction<PartyContactDraft[]>>;
  isReadonly?: boolean;
  errors: Record<string, string>;
  onRequestEdit?: () => void;
};

/* ============================================================
   HELPERS
============================================================ */

const cellInputClass =
  "h-8 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-sm text-black dark:text-slate-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getInitials(name?: string): string {
  if (!name?.trim()) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function createContact(isFirst: boolean): PartyContactDraft {
  return {
    name: "",
    job_title: "",
    email: "",
    phone: "",
    mobile: "",
    notes: "",
    is_primary: isFirst,
  };
}

/* ============================================================
   COMPONENT
============================================================ */

export default function ContactsTab({
  contacts,
  setContacts,
  isReadonly = false,
  errors,
  onRequestEdit,
}: Props) {
  /*
   * Rows can be changed when the record is in edit mode, or when the
   * parent lets us switch it into edit mode.
   */
  const canEdit = !isReadonly || Boolean(onRequestEdit);

  const [searchQuery, setSearchQuery] = useState("");

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [rowDraft, setRowDraft] = useState<PartyContactDraft | null>(null);
  const [isNewRow, setIsNewRow] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(
    null,
  );

  const isEditingRow = editingIndex !== null;

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = contacts.map((contact, index) => ({ contact, index }));

    if (!q) return rows;

    return rows.filter(
      ({ contact, index }) =>
        index === editingIndex ||
        [
          contact.name,
          contact.job_title,
          contact.email,
          contact.phone,
          contact.mobile,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [contacts, searchQuery, editingIndex]);

  /* Record cancelled / switched back to view mode: drop open edits. */
  useEffect(() => {
    if (!isReadonly) return;
    setEditingIndex(null);
    setRowDraft(null);
    setIsNewRow(false);
    setRowError(null);
    setConfirmDeleteIndex(null);
  }, [isReadonly]);

  /* ---------------- Row editing ---------------- */

  const startEdit = (index: number) => {
    if (isEditingRow || !canEdit) return;

    onRequestEdit?.();

    setRowDraft({ ...contacts[index] });
    setEditingIndex(index);
    setIsNewRow(false);
    setRowError(null);
    setConfirmDeleteIndex(null);
  };

  const addRow = () => {
    if (isEditingRow || !canEdit) return;

    onRequestEdit?.();

    const draft = createContact(contacts.length === 0);

    setContacts((prev) => [...prev, draft]);
    setRowDraft(draft);
    setEditingIndex(contacts.length);
    setIsNewRow(true);
    setRowError(null);
    setSearchQuery("");
  };

  const cancelEdit = () => {
    if (isNewRow && editingIndex !== null) {
      const removeIndex = editingIndex;
      setContacts((prev) => prev.filter((_, i) => i !== removeIndex));
    }

    setEditingIndex(null);
    setRowDraft(null);
    setIsNewRow(false);
    setRowError(null);
  };

  const updateRowDraft = <K extends keyof PartyContactDraft>(
    field: K,
    value: PartyContactDraft[K],
  ) => {
    setRowDraft((current) =>
      current ? { ...current, [field]: value } : current,
    );
  };

  const saveRow = () => {
    if (editingIndex === null || !rowDraft) return;

    if (!rowDraft.name?.trim()) {
      setRowError("Contact name is required.");
      return;
    }

    if (rowDraft.email?.trim() && !EMAIL_REGEX.test(rowDraft.email.trim())) {
      setRowError("Enter a valid email address.");
      return;
    }

    const savedIndex = editingIndex;
    const cleaned: PartyContactDraft = {
      ...rowDraft,
      name: rowDraft.name.trim(),
      job_title: rowDraft.job_title?.trim() || "",
      email: rowDraft.email?.trim() || "",
      phone: rowDraft.phone?.trim() || "",
      mobile: rowDraft.mobile?.trim() || "",
      notes: rowDraft.notes?.trim() || "",
    };

    setContacts((prev) => {
      let next = prev.map((c, i) => (i === savedIndex ? cleaned : c));

      if (cleaned.is_primary) {
        next = next.map((c, i) => ({ ...c, is_primary: i === savedIndex }));
      } else if (next.length && !next.some((c) => c.is_primary)) {
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
    setContacts((prev) =>
      prev.map((contact, i) => ({ ...contact, is_primary: i === index })),
    );
  };

  const handleDeleteContact = (index: number) => {
    if (!canEdit) return;
    onRequestEdit?.();
    setContacts((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length > 0 && !filtered.some((c) => c.is_primary)) {
        filtered[0] = { ...filtered[0], is_primary: true };
      }
      return filtered;
    });
    setConfirmDeleteIndex(null);
  };

  const rowKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") saveRow();
    if (event.key === "Escape") cancelEdit();
  };

  /* ============================================================
     RENDER
  ============================================================ */

  const columnCount = canEdit ? 6 : 5;

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <Icon icon="tabler:users" className="text-3xl text-emerald-800" />
          <h3 className="text-base font-bold text-black dark:text-slate-100">
            Contacts
          </h3>
          <span className="rounded-md border border-emerald-200/70 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-400">
            {contacts.length} {contacts.length === 1 ? "Contact" : "Contacts"}
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
              placeholder="Search contacts..."
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
              <span>Add Contact</span>
            </Button>
          )}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800/90 dark:bg-[#11161D]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-emerald-50/60 text-xs font-semibold text-black dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                <th className="w-[24%] px-4 py-2.5">Contact Name</th>
                <th className="w-[20%] px-4 py-2.5">Job Title</th>
                <th className="w-[26%] px-4 py-2.5">Email</th>
                <th className="w-[18%] px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5 text-center">Primary</th>
                {canEdit && <th className="px-4 py-2.5 text-center">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/80">
              {filteredRows.map(({ contact: saved, index }) => {
                const editing = index === editingIndex && rowDraft !== null;
                const c = editing ? rowDraft : saved;
                const rowErrors = Object.entries(errors)
                  .filter(([key]) => key.startsWith(`contacts.${index}.`))
                  .map(([, message]) => message);

                /* ---------------- EDIT ROW ---------------- */
                if (editing) {
                  return (
                    <tr
                      key={saved.id || `contact-${index}`}
                      className="bg-emerald-50/30 align-top dark:bg-emerald-950/10"
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                            {getInitials(c.name)}
                          </span>
                          <input
                            autoFocus
                            value={c.name || ""}
                            onChange={(e) => updateRowDraft("name", e.target.value)}
                            onKeyDown={rowKeyDown}
                            placeholder="Full name *"
                            className={cellInputClass}
                          />
                        </div>
                        {rowError && (
                          <p className="mt-1.5 pl-10 text-[11px] text-red-600">
                            {rowError}
                          </p>
                        )}
                      </td>

                      {/* Job title + notes */}
                      <td className="space-y-1.5 px-4 py-3">
                        <input
                          value={c.job_title || ""}
                          onChange={(e) =>
                            updateRowDraft("job_title", e.target.value)
                          }
                          onKeyDown={rowKeyDown}
                          placeholder="Job title"
                          className={cellInputClass}
                        />
                        <input
                          value={c.notes || ""}
                          onChange={(e) => updateRowDraft("notes", e.target.value)}
                          onKeyDown={rowKeyDown}
                          placeholder="Notes"
                          className={`${cellInputClass} text-xs`}
                        />
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3">
                        <div className="relative">
                          <Icon
                            icon="tabler:mail"
                            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="email"
                            value={c.email || ""}
                            onChange={(e) => updateRowDraft("email", e.target.value)}
                            onKeyDown={rowKeyDown}
                            placeholder="Email"
                            className={`${cellInputClass} pl-7`}
                          />
                        </div>
                      </td>

                      {/* Phone + mobile */}
                      <td className="space-y-1.5 px-4 py-3">
                        <div className="relative">
                          <Icon
                            icon="tabler:phone"
                            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            value={c.phone || ""}
                            onChange={(e) => updateRowDraft("phone", e.target.value)}
                            onKeyDown={rowKeyDown}
                            placeholder="Phone"
                            className={`${cellInputClass} pl-7 tabular-nums`}
                          />
                        </div>
                        <div className="relative">
                          <Icon
                            icon="tabler:device-mobile"
                            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            value={c.mobile || ""}
                            onChange={(e) => updateRowDraft("mobile", e.target.value)}
                            onKeyDown={rowKeyDown}
                            placeholder="Mobile"
                            className={`${cellInputClass} pl-7 tabular-nums`}
                          />
                        </div>
                      </td>

                      {/* Primary */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(c.is_primary)}
                          onChange={(e) =>
                            updateRowDraft("is_primary", e.target.checked)
                          }
                          title="Primary contact"
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
                    key={saved.id || `contact-${index}`}
                    className={`align-middle transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                      rowErrors.length ? "bg-red-50/30 dark:bg-red-950/10" : ""
                    }`}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                          {getInitials(c.name)}
                        </span>
                        <p className="font-semibold text-black dark:text-slate-100">
                          {c.name || (
                            <span className="font-normal italic text-slate-400">
                              Contact {index + 1}
                            </span>
                          )}
                        </p>
                      </div>
                      {rowErrors.length > 0 && (
                        <ul className="mt-1 space-y-0.5 pl-10 text-[11px] text-red-600">
                          {rowErrors.map((message) => (
                            <li key={message}>{message}</li>
                          ))}
                        </ul>
                      )}
                    </td>

                    {/* Job title */}
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-300">
                      {c.job_title || <span className="text-slate-400">—</span>}
                      {c.notes && (
                        <p
                          className="mt-0.5 max-w-[220px] truncate text-[11px] text-slate-500"
                          title={c.notes}
                        >
                          {c.notes}
                        </p>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="inline-flex items-center gap-1.5 break-all text-slate-800 transition-colors hover:text-emerald-700 dark:text-slate-200 dark:hover:text-emerald-400"
                        >
                          <Icon
                            icon="tabler:mail"
                            className="h-4 w-4 shrink-0 text-slate-600"
                          />
                          <span>{c.email}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Phone (+ mobile) */}
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      {c.phone || c.mobile ? (
                        <div className="space-y-1">
                          {[
                            { value: c.phone, icon: "tabler:phone" },
                            { value: c.mobile, icon: "tabler:device-mobile" },
                          ]
                            .filter((item) => item.value)
                            .map((item) => (
                              <a
                                key={item.icon}
                                href={`tel:${item.value}`}
                                className="flex items-center gap-1.5 text-slate-800 transition-colors hover:text-emerald-700 dark:text-slate-200 dark:hover:text-emerald-400"
                              >
                                <Icon
                                  icon={item.icon}
                                  className="h-4 w-4 shrink-0 text-slate-600"
                                />
                                <span>{item.value}</span>
                              </a>
                            ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Primary */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name="primaryContactTableRadio"
                        aria-label={`Mark ${c.name || `Contact ${index + 1}`} as primary`}
                        checked={Boolean(c.is_primary)}
                        disabled={!canEdit || isEditingRow}
                        onChange={() => handleSetPrimary(index)}
                        className="h-4 w-4 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="whitespace-nowrap px-4 py-3">
                        {confirmDeleteIndex === index ? (
                          <div className="flex items-center justify-center gap-1 text-xs">
                            <span className="text-slate-600 dark:text-slate-400">
                              Delete?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(index)}
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
                              title="Delete contact"
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
                    {contacts.length === 0
                      ? "No contacts added yet."
                      : `No contacts match “${searchQuery}”.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* "use client";

import { Button } from "@/components/ui/button";
import type { PartyContactDraft } from "@/types/erp";

type Props = {
  contacts: PartyContactDraft[];
  setContacts: React.Dispatch<React.SetStateAction<PartyContactDraft[]>>;
  isReadonly?: boolean;
  errors: Record<string, string>;
  onRequestEdit?: () => void;
};

export default function ContactsTab({
  contacts,
  setContacts,
  isReadonly = false,
  errors,
  onRequestEdit,
}: Props) {
  const addContactRow = () => {
    onRequestEdit?.();
    setContacts([
      ...contacts,
      {
        name: "",
        email: "",
        phone: "",
        mobile: "",
        job_title: "",
        notes: "",
        is_primary: contacts.length === 0,
      },
    ]);
  };

  const updateContactRow = (
    idx: number,
    key: keyof PartyContactDraft,
    val: string | boolean,
  ) => {
    setContacts(contacts.map((c, i) => (i === idx ? { ...c, [key]: val } : c)));
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
          Contacts
        </h3>
     
          <Button type="button" onClick={addContactRow} variant="add_line" >
            Add Contact
          </Button>
 
      </div>

      {contacts.length === 0 && (
        <div className="p-8 text-center text-sm border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400">
          No personnel assignments appended yet.
        </div>
      )}
      {contacts.map((c, idx) => (
        <div
          key={idx}
          className="relative rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
        >
   
          <div className="flex items-center justify-between font-medium px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Contact {idx + 1}</span>

              {c.is_primary && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  Primary
                </span>
              )}
            </div>
            {!isReadonly && (
              <button
                type="button"
                onClick={() =>
                  setContacts(contacts.filter((_, i) => i !== idx))
                }
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
              >
                ✕
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-3 p-4">
            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Contact Name *
              </label>
              <input
                type="text"
                value={c.name}
                disabled={isReadonly}
                onChange={(e) => updateContactRow(idx, "name", e.target.value)}
                className={getInputClass(`contacts.${idx}.name`)}
              />
              {errors[`contacts.${idx}.name`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`contacts.${idx}.name`]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Job Title
              </label>
              <input
                type="text"
                value={c.job_title || ""}
                onChange={(e) =>
                  updateContactRow(idx, "job_title", e.target.value)
                }
                disabled={isReadonly}
                className={getInputClass(
                  `contacts.${idx}.job_title`,
                  "col-span-2",
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={c.email || ""}
                disabled={isReadonly}
                onChange={(e) => updateContactRow(idx, "email", e.target.value)}
                className={getInputClass(`contacts.${idx}.email`)}
              />
              {errors[`contacts.${idx}.email`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`contacts.${idx}.email`]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Phone
              </label>
              <input
                type="text"
                value={c.phone || ""}
                disabled={isReadonly}
                onChange={(e) => updateContactRow(idx, "phone", e.target.value)}
                className={getInputClass(`contacts.${idx}.phone`, "col-span-2")}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mobile
              </label>
              <input
                type="text"
                value={c.mobile || ""}
                onChange={(e) =>
                  updateContactRow(idx, "mobile", e.target.value)
                }
                disabled={isReadonly}
                className={getInputClass(
                  `contacts.${idx}.mobile`,
                  "col-span-2",
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mark as Primary
              </label>
              <div className="col-span-2">
                <div className="flex flex-wrap gap-4 text-sm font-medium p-2 w-8">
                  <input
                    type="checkbox"
                    checked={!!c.is_primary}
                    disabled={isReadonly}
                    onChange={() =>
                      setContacts(
                        contacts.map((contact, i) => ({
                          ...contact,
                          is_primary: i === idx,
                        })),
                      )
                    }
                    className={`w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 ${
                      isReadonly
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} */

{
  /* <div className="xl:col-span-2 grid grid-cols-6 gap-3 items-start">
              <label className="text-sm font-medium col-span-1 pt-2">
                Notes
              </label>

              <textarea
                rows={4}
                disabled={isReadonly}
                value={c.notes || ""}
                onChange={(e) => updateContactRow(idx, "notes", e.target.value)}
                className={getInputClass(`contacts.${idx}.notes`, "col-span-5")}
              />
            </div> */
}
