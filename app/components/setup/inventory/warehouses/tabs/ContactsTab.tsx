// app/components/setup/inventory/warehouses/tabs/ContactsTab.tsx

"use client";

import { WarehouseContact } from "@/types/warehouse";
import { useState } from "react";
import ContactForm from "./ContactForm";

type Props = {
  warehouseId: string;
  contacts: WarehouseContact[];
  setContacts: React.Dispatch<
    React.SetStateAction<WarehouseContact[]>
  >;
};

export default function ContactsTab({
  warehouseId,
  contacts,
  setContacts,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editContact, setEditContact] =
    useState<WarehouseContact | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete contact?")) return;

    const res = await fetch(
      `/api/setup/warehouses/${warehouseId}/contacts/${id}`,
      { method: "DELETE" },
    );

    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      {/* ADD BUTTON */}
      <button
        onClick={() => {
          setShowForm(true);
          setEditContact(null);
        }}
        className="bg-blue-600 text-white px-3 py-1 rounded"
      >
        + Add Contact
      </button>

      {/* FORM */}
      {(showForm || editContact) && (
        <ContactForm
          warehouseId={warehouseId}
          existing={editContact || undefined}
          onSuccess={(c) => {
            setContacts((prev) => {
              const filtered = prev.filter((x) => x.id !== c.id);
              return [...filtered, c];
            });

            setShowForm(false);
            setEditContact(null);
          }}
        />
      )}

      {/* LIST */}
      <div className="space-y-2">
        {contacts.map((c) => (
          <div
            key={c.id}
            className="border p-3 flex justify-between items-center"
          >
            <div>
              <div className="font-semibold">{c.name}</div>
              <div className="text-sm text-gray-500">
                {c.type} • {c.email}
              </div>
            </div>

            <div className="flex gap-2 text-sm">
              <button
                onClick={() => {
                  setEditContact(c);
                  setShowForm(false);
                }}
                className="text-green-600"
              >
                ✏ Edit
              </button>

              <button
                onClick={() => handleDelete(c.id)}
                className="text-red-600"
              >
                🗑 Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* "use client";
import { WarehouseContact } from "@/types/warehouse";

type Props = {
  warehouseId: string;
  contacts: WarehouseContact[];
  setContacts: (data: WarehouseContact[]) => void;
};

export default function ContactsTab({
  warehouseId,
  contacts,
  setContacts,
}: Props) {
  const addContact = async () => {
    const name = prompt("Contact name");
    if (!name) return;

    const res = await fetch(
      `/api/setup/warehouses/${warehouseId}/contacts`,
      {
        method: "POST",
        body: JSON.stringify({ name }),
      }
    );

    const newContact = await res.json();
    setContacts([...contacts, newContact]);
  };

  return (
    <div>
      <button
        onClick={addContact}
        className="bg-blue-600 text-white px-3 py-1 rounded"
      >
        + Add Contact
      </button>

      <ul className="mt-3">
        {contacts.map((c) => (
          <li key={c.id} className="border-b py-2">
            {c.name}
          </li>
        ))}
      </ul>
    </div>
  );
} */