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
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Contacts
        </h3>
        <button
          type="button"
          onClick={addContactRow}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors shadow-sm"
        >
          + Add Contact
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
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start border border-slate-200 dark:border-slate-800 p-4 relative "
        >
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Contact Name *
              </label>
              <input
                type="text"
                value={c.name}
                onChange={(e) => updateContactRow(idx, "name", e.target.value)}
                className={`w-full border p-2 rounded text-xs bg-white dark:bg-slate-900 ${errors[`contacts.${idx}.name`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`contacts.${idx}.name`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`contacts.${idx}.name`]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Job Title
              </label>
              <input
                type="text"
                value={c.job_title || ""}
                onChange={(e) =>
                  updateContactRow(idx, "job_title", e.target.value)
                }
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
                // className="w-full border p-2 rounded text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Direct Line
              </label>
              <input
                type="email"
                value={c.email || ""}
                onChange={(e) => updateContactRow(idx, "email", e.target.value)}
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
                // className={`w-full border p-2 rounded text-xs bg-white dark:bg-slate-900 ${errors[`contacts.${idx}.email`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`contacts.${idx}.email`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`contacts.${idx}.email`]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Phone
              </label>
              <input
                type="text"
                value={c.phone || ""}
                onChange={(e) => updateContactRow(idx, "phone", e.target.value)}
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
                // className="w-full border p-2 rounded text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Mobile
              </label>
              <input
                type="text"
                value={c.mobile || ""}
                onChange={(e) =>
                  updateContactRow(idx, "mobile", e.target.value)
                }
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
                // className="w-full border p-2 rounded text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setContacts(contacts.filter((_, i) => i !== idx))}
              className="absolute top-1 right-3 text-slate-400 hover:text-red-500 transition-colors text-base"
            >
              ✕
            </button>
            <div className="grid grid-cols-3 gap-2 items-center mt-6">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Primary Contact Notes
              </label>
              <textarea
                value={c.notes || ""}
                onChange={(e) => updateContactRow(idx, "notes", e.target.value)}
                className="col-span-2 p-2 border border-slate-300 dark:border-slate-700 rounded text-xs dark:bg-slate-900"
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
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
                  className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 rounded"
                />
                Mark as Primary
              </label>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
