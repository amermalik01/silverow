// app/components/setup/inventory/warehouses/tabs/ContactsTab.tsx

"use client";

import { WarehouseContact } from "@/types/warehouse";
import { useState } from "react";
import ContactForm from "./ContactForm";
import { Button } from "@/components/ui/button";

type Props = {
  warehouseId: string;
  contacts: WarehouseContact[];
  setContacts: React.Dispatch<React.SetStateAction<WarehouseContact[]>>;
  isReadOnly?: boolean;
};

export default function ContactsTab({
  warehouseId,
  contacts,
  setContacts,
  isReadOnly = false,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [selectedContact, setSelectedContact] =
    useState<WarehouseContact | null>(null);
  const [search, setSearch] = useState("");

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.job_title?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (id: string) => {
    if (isReadOnly || !confirm("Are you sure you want to delete this contact?"))
      return;

    const res = await fetch(
      `/api/setup/warehouses/${warehouseId}/contacts/${id}`,
      {
        method: "DELETE",
      },
    );

    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <input
          type="text"
          placeholder="Search contact name or job title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3.5 py-1.5 border border-slate-300 text-xs rounded-md w-72 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {!isReadOnly && (
          <Button
            onClick={() => {
              setShowForm(true);
              setSelectedContact(null);
            }}
            variant="add_line"
            // className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Contact
          </Button>
        )}
      </div>

      {/* Form Dialog Panel */}
      {(showForm || selectedContact) && (
        <ContactForm
          warehouseId={warehouseId}
          existing={selectedContact || undefined}
          isReadOnly={isReadOnly}
          onClose={() => {
            setShowForm(false);
            setSelectedContact(null);
          }}
          onSuccess={(contact) => {
            setContacts((prev) => {
              const filtered = prev.filter((x) => x.id !== contact.id);
              return [...filtered, contact];
            });
            setShowForm(false);
            setSelectedContact(null);
          }}
        />
      )}

      {/* High-density Contacts Data Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs table-fixed">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-xs capitalize tracking-wider">
              <th className="px-4 py-3">Contact Name</th>
              <th className="px-4 py-3">Job Title</th>
              <th className="px-4 py-3">Location Name</th>
              <th className="px-4 py-3">Direct Line</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredContacts.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-400 text-xs"
                >
                  No contact records found.
                </td>
              </tr>
            ) : (
              filteredContacts.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.job_title || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.location_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.direct_line || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.mobile || "—"}
                  </td>
                  <td className="px-4 py-3 text-blue-600">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-right space-x-2 font-medium text-xs">
                    <Button
                      onClick={() => {
                        setSelectedContact(c);
                        setShowForm(false);
                      }}
                      variant="edit"
                    >
                      {isReadOnly ? "View" : "Edit"}
                    </Button>
                    {!isReadOnly && (
                      <Button
                        onClick={() => handleDelete(c.id)}
                        variant="cancel"
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* "use client";

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

      <Button
        onClick={() => {
          setShowForm(true);
          setEditContact(null);
        }}
        className="bg-blue-600 text-white px-3 py-1 rounded"
      >
        + Add Contact
      </Button>


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


      <div className="space-y-2">
        {contacts.map((c) => (
          <div
            key={c.id}
            className="border p-3 flex justify-between items-center"
          >
            <div>
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-gray-500">
                {c.type} • {c.email}
              </div>
            </div>

            <div className="flex gap-2 text-xs">
              <Button
                onClick={() => {
                  setEditContact(c);
                  setShowForm(false);
                }}
                className="text-green-600"
              >
                ✏ Edit
              </Button>

              <Button
                onClick={() => handleDelete(c.id)}
                variant="cancel"
              >
                🗑 Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} */
