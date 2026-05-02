// components/parties/tabs/ContactsTab.tsx

"use client";

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
    <div className="space-y-4">
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
}

/* "use client";

import { PartyContact } from "@/types/erp";

type Props = {
  contacts: Partial<PartyContact>[];
  setContacts: React.Dispatch<
    React.SetStateAction<Partial<PartyContact>[]>
  >;
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
    key: keyof PartyContact,
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
    <div className="space-y-4">

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
              value={c.name || ""}
              onChange={(e) =>
                updateContact(i, "name", e.target.value)
              }
              className="border p-2 rounded"
            />


            <input
              placeholder="Job Title"
              value={c.job_title || ""}
              onChange={(e) =>
                updateContact(i, "job_title", e.target.value)
              }
              className="border p-2 rounded"
            />

            <input
              placeholder="Email"
              value={c.email || ""}
              onChange={(e) =>
                updateContact(i, "email", e.target.value)
              }
              className="border p-2 rounded"
            />


            <input
              placeholder="Phone"
              value={c.phone || ""}
              onChange={(e) =>
                updateContact(i, "phone", e.target.value)
              }
              className="border p-2 rounded"
            />


            <input
              placeholder="Mobile"
              value={c.mobile || ""}
              onChange={(e) =>
                updateContact(i, "mobile", e.target.value)
              }
              className="border p-2 rounded"
            />

            <label className="flex items-center gap-2 col-span-2">
              <input
                type="checkbox"
                checked={c.is_primary || false}
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
