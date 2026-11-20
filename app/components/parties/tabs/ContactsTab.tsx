// components/parties/tabs/ContactsTab.tsx

"use client";

import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import type { PartyContactDraft } from "@/types/erp";

type Props = {
  contacts: PartyContactDraft[];
  setContacts: React.Dispatch<React.SetStateAction<PartyContactDraft[]>>;
  isReadonly?: boolean;
  errors: Record<string, string>;
  onRequestEdit?: () => void;
};

function getInitials(name?: string): string {
  if (!name?.trim()) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ContactsTab({
  contacts,
  setContacts,
  isReadonly = false,
  errors,
  onRequestEdit,
}: Props) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addContactRow = () => {
    onRequestEdit?.();
    const nextIndex = contacts.length;
    setContacts((prev) => [
      ...prev,
      {
        name: "",
        email: "",
        phone: "",
        mobile: "",
        job_title: "",
        notes: "",
        is_primary: prev.length === 0,
      },
    ]);
    setEditingIndex(nextIndex);
  };

  const updateContactRow = (
    idx: number,
    key: keyof PartyContactDraft,
    val: string | boolean,
  ) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [key]: val } : c)),
    );
  };

  const handleSetPrimary = (idx: number) => {
    if (isReadonly) return;
    onRequestEdit?.();
    setContacts((prev) =>
      prev.map((contact, i) => ({
        ...contact,
        is_primary: i === idx,
      })),
    );
  };

  const handleDeleteContact = (idx: number) => {
    if (isReadonly) return;
    onRequestEdit?.();
    setContacts((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      if (filtered.length > 0 && !filtered.some((c) => c.is_primary)) {
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
      return `${baseClasses} bg-slate-100/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-black dark:text-slate-300 cursor-not-allowed select-none`;
    }

    const stateClasses = errors[errorKey]
      ? "border-red-500 bg-red-50/20 text-black dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-black dark:text-slate-100 focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-600 dark:focus:ring-emerald-500";

    return `${baseClasses} ${stateClasses}`;
  };

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return contacts
      .map((contact, originalIndex) => ({ contact, originalIndex }))
      .filter(({ contact }) => {
        if (!q) return true;
        return (
          (contact.name || "").toLowerCase().includes(q) ||
          (contact.job_title || "").toLowerCase().includes(q) ||
          (contact.email || "").toLowerCase().includes(q) ||
          (contact.phone || "").toLowerCase().includes(q) ||
          (contact.mobile || "").toLowerCase().includes(q)
        );
      });
  }, [contacts, searchQuery]);

  const activeEditContact =
    editingIndex !== null && contacts[editingIndex]
      ? contacts[editingIndex]
      : null;

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon
            icon="tabler:users"
            className="w-4 h-4 text-black dark:text-slate-400"
          />
          <h3 className="text-sm font-semibold text-black dark:text-slate-100">
            Contacts
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 tabular-nums">
            {contacts.length} {contacts.length === 1 ? "Contact" : "Contacts"}
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
              placeholder="Search contacts..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161D] text-sm text-black dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-600 dark:focus:ring-emerald-500 transition-colors"
            />
          </div>

          <Button
            type="button"
            onClick={addContactRow}
            variant="add_line"
            className="rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-1.5 inline-flex items-center gap-1.5 shrink-0"
          >
            <Icon icon="tabler:plus" className="w-3.5 h-3.5" />
            <span>Add Contact</span>
          </Button>
        </div>
      </div>

      {/* Inline Editor Drawer when a row is added or clicked to edit */}
      {activeEditContact && editingIndex !== null && (
        <div className="rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 bg-white dark:bg-[#11161D] p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-black dark:text-slate-100">
                {activeEditContact.name
                  ? `Editing: ${activeEditContact.name}`
                  : `New Contact #${editingIndex + 1}`}
              </span>
              {activeEditContact.is_primary && (
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-black dark:text-slate-400 mb-1">
                Contact Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={activeEditContact.name}
                disabled={isReadonly}
                onChange={(e) =>
                  updateContactRow(editingIndex, "name", e.target.value)
                }
                className={getInputClass(`contacts.${editingIndex}.name`)}
                placeholder="Full name"
              />
              {errors[`contacts.${editingIndex}.name`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`contacts.${editingIndex}.name`]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-black dark:text-slate-400 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={activeEditContact.job_title || ""}
                disabled={isReadonly}
                onChange={(e) =>
                  updateContactRow(editingIndex, "job_title", e.target.value)
                }
                className={getInputClass(`contacts.${editingIndex}.job_title`)}
                placeholder="e.g. Account Manager"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-black dark:text-slate-400 mb-1">
                Email
              </label>
              <input
                type="email"
                value={activeEditContact.email || ""}
                disabled={isReadonly}
                onChange={(e) =>
                  updateContactRow(editingIndex, "email", e.target.value)
                }
                className={getInputClass(`contacts.${editingIndex}.email`)}
                placeholder="name@company.com"
              />
              {errors[`contacts.${editingIndex}.email`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`contacts.${editingIndex}.email`]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-black dark:text-slate-400 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={activeEditContact.phone || ""}
                disabled={isReadonly}
                onChange={(e) =>
                  updateContactRow(editingIndex, "phone", e.target.value)
                }
                className={`${getInputClass(`contacts.${editingIndex}.phone`)} tabular-nums`}
                placeholder="+44 ..."
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-black dark:text-slate-400 mb-1">
                Mobile
              </label>
              <input
                type="text"
                value={activeEditContact.mobile || ""}
                disabled={isReadonly}
                onChange={(e) =>
                  updateContactRow(editingIndex, "mobile", e.target.value)
                }
                className={`${getInputClass(`contacts.${editingIndex}.mobile`)} tabular-nums`}
                placeholder="+44 ..."
              />
            </div>

            <div className="flex items-end pb-1">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="primaryContactRadio"
                  checked={!!activeEditContact.is_primary}
                  disabled={isReadonly}
                  onChange={() => handleSetPrimary(editingIndex)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Primary Contact</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {contacts.length === 0 ? (
        <div className="p-8 text-center text-sm rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#11161D]/50 text-slate-400">
          No personnel assignments appended yet.
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="p-8 text-center text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161D] text-slate-400">
          No contacts match &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : (
        /* Contacts Table Card */
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#11161D] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-black dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
                  <th className="py-2.5 px-4">Contact Name</th>
                  <th className="py-2.5 px-4">Job Title</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Phone</th>
                  <th className="py-2.5 px-4 text-center">Primary</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {filteredContacts.map(({ contact: c, originalIndex: idx }) => {
                  const displayPhone = c.mobile || c.phone || "—";
                  const hasRowError = Boolean(
                    errors[`contacts.${idx}.name`] ||
                    errors[`contacts.${idx}.email`] ||
                    errors[`contacts.${idx}.phone`] ||
                    errors[`contacts.${idx}.mobile`],
                  );

                  return (
                    <tr
                      key={idx}
                      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                        hasRowError ? "bg-red-50/20 dark:bg-red-950/10" : ""
                      }`}
                    >
                      {/* Contact Name + Initials Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-700 dark:text-slate-200">
                            {getInitials(c.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-black dark:text-slate-100 truncate">
                              {c.name || (
                                <span className="italic text-slate-400 font-normal">
                                  Unnamed Contact
                                </span>
                              )}
                            </p>
                            {errors[`contacts.${idx}.name`] && (
                              <p className="text-[11px] text-red-500">
                                {errors[`contacts.${idx}.name`]}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Job Title */}
                      <td className="py-3 px-4 text-black dark:text-slate-300 whitespace-nowrap">
                        {c.job_title || "—"}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                          >
                            <Icon
                              icon="tabler:mail"
                              className="w-3.5 h-3.5 text-slate-400 shrink-0"
                            />
                            <span>{c.email}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                        {displayPhone !== "—" ? (
                          <a
                            href={`tel:${displayPhone}`}
                            className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                          >
                            <Icon
                              icon="tabler:phone"
                              className="w-3.5 h-3.5 text-slate-400 shrink-0"
                            />
                            <span>{displayPhone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Primary Radio */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="radio"
                          name="primaryContactTableRadio"
                          aria-label={`Mark ${c.name || `Contact ${idx + 1}`} as primary`}
                          checked={!!c.is_primary}
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
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onRequestEdit?.();
                              setEditingIndex(
                                editingIndex === idx ? null : idx,
                              );
                            }}
                            className="p-1.5 rounded-lg text-black hover:text-black dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Contact"
                          >
                            <Icon icon="tabler:pencil" className="w-4 h-4" />
                          </button>

                          {!isReadonly && (
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(idx)}
                              className="p-1.5 rounded-lg text-black hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              title="Delete Contact"
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
