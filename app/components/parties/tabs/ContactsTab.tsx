// components/parties/tabs/ContactsTab.tsx

"use client";

import type { PartyContactDraft } from "@/types/erp";

type Props = {
  contacts: PartyContactDraft[];
  setContacts: React.Dispatch<React.SetStateAction<PartyContactDraft[]>>;
  errors: Record<string, string>;
};

export default function ContactsTab({ contacts, setContacts, errors }: Props) {
  const addContactRow = () => {
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider">
          Contact(s)
        </h3>
        <button
          type="button"
          onClick={addContactRow}
          // className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors shadow-sm"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Add Contact
        </button>
      </div>

      {contacts.length === 0 && (
        <div className="p-8 text-center text-xs border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400">
          No personnel assignments appended yet.
        </div>
      )}
      {/*  bg-slate-50/50 dark:bg-slate-800/20 rounded-xl */}
      {contacts.map((c, idx) => (
        <div
          key={idx}
          className="relative rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between font-medium px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Contact {idx + 1}</span>

              {c.is_primary && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  Primary
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setContacts(contacts.filter((_, i) => i !== idx))}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
            >
              ✕
            </button>
          </div>
          {/* Body */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-3 p-4">
            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Contact Name *
              </label>
              <input
                type="text"
                value={c.name}
                onChange={(e) => updateContactRow(idx, "name", e.target.value)}
                className={`col-span-2 p-2 rounded text-xs border ${
                  errors[`contacts.${idx}.name`]
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-700"
                } dark:bg-slate-900`}
                // className={`w-full border p-2 rounded text-xs bg-white dark:bg-slate-900 ${errors[`contacts.${idx}.name`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`contacts.${idx}.name`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`contacts.${idx}.name`]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Job Title
              </label>
              <input
                type="text"
                value={c.job_title || ""}
                onChange={(e) =>
                  updateContactRow(idx, "job_title", e.target.value)
                }
                className="col-span-2 p-2 rounded text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                // className="w-full border p-2 rounded text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={c.email || ""}
                onChange={(e) => updateContactRow(idx, "email", e.target.value)}
                className="col-span-2 p-2 rounded text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                // className={`w-full border p-2 rounded text-xs bg-white dark:bg-slate-900 ${errors[`contacts.${idx}.email`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`contacts.${idx}.email`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`contacts.${idx}.email`]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Phone
              </label>
              <input
                type="text"
                value={c.phone || ""}
                onChange={(e) => updateContactRow(idx, "phone", e.target.value)}
                className="col-span-2 p-2 rounded text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                // className="w-full border p-2 rounded text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Mobile
              </label>
              <input
                type="text"
                value={c.mobile || ""}
                onChange={(e) =>
                  updateContactRow(idx, "mobile", e.target.value)
                }
                className="col-span-2 p-2 rounded text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                // className="w-full border p-2 rounded text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Mark as Primary
              </label>
              <div className="col-span-2">
                <div className="flex flex-wrap gap-4 text-xs font-medium p-2 w-8">
                  <input
                    type="checkbox"
                    checked={!!c.is_primary}
                    onChange={() =>
                      setContacts(
                        contacts.map((contact, i) => ({
                          ...contact,
                          is_primary: i === idx,
                        })),
                      )
                    }
                    className="w-4 h-4"
                  />
                </div>
              </div>
            </div>

            <div className="xl:col-span-2 grid grid-cols-6 gap-3 items-start">
              <label className="text-xs font-medium col-span-1 pt-2">
                Notes
              </label>

              <textarea
                rows={4}
                value={c.notes || ""}
                onChange={(e) => updateContactRow(idx, "notes", e.target.value)}
                className="col-span-5 p-2 rounded text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
