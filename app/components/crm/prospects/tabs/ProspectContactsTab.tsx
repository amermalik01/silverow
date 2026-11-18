// app/components/crm/prospects/tabs/ProspectContactsTab.tsx

"use client";

import type { ProspectContact } from "@/types/prospect";

type Props = {
  contacts: ProspectContact[];
  onChange: (contacts: ProspectContact[]) => void;
};

const inputClass =
  "h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

export default function ProspectContactsTab({ contacts, onChange }: Props) {
  const update = (
    index: number,
    field: keyof ProspectContact,
    value: string | boolean | null,
  ) => {
    onChange(
      contacts.map((contact, currentIndex) =>
        currentIndex === index ? { ...contact, [field]: value } : contact,
      ),
    );
  };

  const addContact = () => {
    onChange([
      ...contacts,
      {
        name: "",
        job_title: null,
        email: null,
        phone: null,
        mobile: null,
        is_primary: contacts.length === 0,
        notes: null,
      },
    ]);
  };

  const removeContact = (index: number) => {
    const remaining = contacts.filter(
      (_, currentIndex) => currentIndex !== index,
    );
    if (contacts[index]?.is_primary && remaining.length) {
      remaining[0] = { ...remaining[0], is_primary: true };
    }
    onChange(remaining);
  };

  const setPrimary = (index: number) => {
    onChange(
      contacts.map((contact, currentIndex) => ({
        ...contact,
        is_primary: currentIndex === index,
      })),
    );
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Contacts</h3>
          <p className="text-xs text-slate-500">
            Manage all people associated with this prospect.
          </p>
        </div>
        <button
          type="button"
          onClick={addContact}
          className="rounded-md bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
        >
          + Add Contact
        </button>
      </div>

      <div className="space-y-4">
        {contacts.map((contact, index) => (
          <div
            key={contact.id || `new-contact-${index}`}
            className="rounded-lg border border-slate-200 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">
                Contact {index + 1}
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="radio"
                    checked={contact.is_primary}
                    onChange={() => setPrimary(index)}
                    className="accent-emerald-800"
                  />
                  Primary
                </label>
                <button
                  type="button"
                  onClick={() => removeContact(index)}
                  className="text-xs font-medium text-rose-600 hover:text-rose-800"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className={inputClass}
                placeholder="Full name *"
                value={contact.name}
                onChange={(event) => update(index, "name", event.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Job title"
                value={contact.job_title || ""}
                onChange={(event) =>
                  update(index, "job_title", event.target.value)
                }
              />
              <input
                className={inputClass}
                type="email"
                placeholder="Email"
                value={contact.email || ""}
                onChange={(event) => update(index, "email", event.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Phone"
                value={contact.phone || ""}
                onChange={(event) => update(index, "phone", event.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Mobile"
                value={contact.mobile || ""}
                onChange={(event) =>
                  update(index, "mobile", event.target.value)
                }
              />
              <input
                className={inputClass}
                placeholder="Notes"
                value={contact.notes || ""}
                onChange={(event) => update(index, "notes", event.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
