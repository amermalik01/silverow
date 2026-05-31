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
}

/* "use client";

import { PartyContactDraft } from "@/types/erp";

type Props = {
  contacts: PartyContactDraft[];
  setContacts: React.Dispatch<React.SetStateAction<PartyContactDraft[]>>;
};

export default function ContactsTab({ contacts, setContacts }: Props) {
  const addContact = () => {
    setContacts([
      ...contacts,
      {
        name: "",
        email: "",
        phone: "",
        mobile: "",
        job_title: "",
        is_primary: false,
      },
    ]);
  };

  const updateContact = (
    index: number,
    key: keyof PartyContactDraft,
    value: string | boolean,
  ) => {
    const updated = [...contacts];

    updated[index] = {
      ...updated[index],
      [key]: value,
    };

    setContacts(updated);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const setPrimary = (index: number) => {
    setContacts(
      contacts.map((c, i) => ({
        ...c,
        is_primary: i === index,
      })),
    );
  };

  return (
    
    <div className="space-y-6 container mx-auto p-4 bg-white dark:bg-slate-900 border rounded-xl ">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Contacts</h2>

        <button
          onClick={addContact}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          + Add Contact
        </button>
      </div>

      <div className="space-y-3">
        {contacts.map((c, i) => (
          <div
            key={i}
            className="border rounded p-4 grid grid-cols-2 gap-3 relative"
          >
            <button
              onClick={() => removeContact(i)}
              className="absolute top-2 right-2 text-red-500 text-sm"
            >
              ✕
            </button>

            <input
              placeholder="Name"
              value={c.name}
              onChange={(e) => updateContact(i, "name", e.target.value)}
              className="border p-2 rounded"
            />

            <input
              placeholder="Job Title"
              value={c.job_title || ""}
              onChange={(e) => updateContact(i, "job_title", e.target.value)}
              className="border p-2 rounded"
            />

            <input
              placeholder="Email"
              value={c.email || ""}
              onChange={(e) => updateContact(i, "email", e.target.value)}
              className="border p-2 rounded"
            />

            <input
              placeholder="Phone"
              value={c.phone || ""}
              onChange={(e) => updateContact(i, "phone", e.target.value)}
              className="border p-2 rounded"
            />

            <input
              placeholder="Mobile"
              value={c.mobile || ""}
              onChange={(e) => updateContact(i, "mobile", e.target.value)}
              className="border p-2 rounded"
            />

            <label className="flex items-center gap-2 col-span-2">
              <input
                type="checkbox"
                checked={c.is_primary}
                onChange={() => setPrimary(i)}
              />
              Primary Contact
            </label>
          </div>
        ))}
      </div>
    </div>
  );
} */
