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

  const updateContactRow = (idx: number, key: keyof PartyContactDraft, val: string | boolean) => {
    setContacts(contacts.map((c, i) => (i === idx ? { ...c, [key]: val } : c)));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Associated Corporate Contacts</h3>
        <button type="button" onClick={addContactRow} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm">
          + Append Contact Profile
        </button>
      </div>

      {contacts.length === 0 && (
        <div className="p-8 text-center text-sm border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400">
          No personnel assignments appended yet.
        </div>
      )}

      <div className="space-y-4">
        {contacts.map((c, idx) => (
          <div key={idx} className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl relative grid grid-cols-1 md:grid-cols-3 gap-3">
            <button type="button" onClick={() => setContacts(contacts.filter((_, i) => i !== idx))} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors text-base">✕</button>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Full Name *</label>
              <input type="text" value={c.name} onChange={(e) => updateContactRow(idx, "name", e.target.value)} className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 ${errors[`contacts.${idx}.name`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`} />
              {errors[`contacts.${idx}.name`] && <p className="text-red-500 text-[11px] mt-0.5">{errors[`contacts.${idx}.name`]}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Functional Role Title</label>
              <input type="text" value={c.job_title || ""} onChange={(e) => updateContactRow(idx, "job_title", e.target.value)} className="w-full border p-2 rounded-lg text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Direct Email Access Line</label>
              <input type="email" value={c.email || ""} onChange={(e) => updateContactRow(idx, "email", e.target.value)} className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 ${errors[`contacts.${idx}.email`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`} />
              {errors[`contacts.${idx}.email`] && <p className="text-red-500 text-[11px] mt-0.5">{errors[`contacts.${idx}.email`]}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Phone Connection</label>
              <input type="text" value={c.phone || ""} onChange={(e) => updateContactRow(idx, "phone", e.target.value)} className="w-full border p-2 rounded-lg text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Mobile Device Target</label>
              <input type="text" value={c.mobile || ""} onChange={(e) => updateContactRow(idx, "mobile", e.target.value)} className="w-full border p-2 rounded-lg text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Internal Reference Notes</label>
              <textarea value={c.notes || ""} onChange={(e) => updateContactRow(idx, "notes", e.target.value)} className="w-full border p-2 rounded-lg text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 h-16 resize-none" placeholder="Add operational history context..." />
            </div>

            <div className="md:col-span-3 flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={!!c.is_primary} onChange={() => setContacts(contacts.map((contact, i) => ({ ...contact, is_primary: i === idx })))} className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 rounded" />
                Mark as Primary Operational Stakeholder Link
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* "use client";

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

  const enforcePrimaryContact = (idx: number) => {
    setContacts(contacts.map((c, i) => ({ ...c, is_primary: i === idx })));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Associated Corporate Contacts
        </h3>
        <button
          type="button"
          onClick={addContactRow}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          + Append Contact Profile
        </button>
      </div>

      {contacts.length === 0 && (
        <div className="p-8 text-center text-sm border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400">
          No personnel assignments appended yet. Click the button above to add
          one.
        </div>
      )}

      <div className="space-y-4">
        {contacts.map((c, idx) => (
          <div
            key={idx}
            className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl relative grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            <button
              type="button"
              onClick={() => setContacts(contacts.filter((_, i) => i !== idx))}
              className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors text-base"
            >
              ✕
            </button>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                FullName *
              </label>
              <input
                type="text"
                value={c.name}
                onChange={(e) => updateContactRow(idx, "name", e.target.value)}
                className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${
                  errors[`contacts.${idx}.name`]
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Functional Role Title
              </label>
              <input
                type="text"
                value={c.job_title || ""}
                onChange={(e) =>
                  updateContactRow(idx, "job_title", e.target.value)
                }
                className="w-full border p-2 rounded-lg text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Direct Email Access Line
              </label>
              <input
                type="email"
                value={c.email || ""}
                onChange={(e) => updateContactRow(idx, "email", e.target.value)}
                className={`w-full border p-2 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${
                  errors[`contacts.${idx}.email`]
                    ? "border-red-500"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-2 pt-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!c.is_primary}
                  onChange={() => enforcePrimaryContact(idx)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-700"
                />
                Mark as Primary Operational Stakeholder Link
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} */


