// app/components/sales/crm/tabs/ContactsTab.tsx
"use client";

import { Button } from "@/components/ui/button";
import { CRMContact } from "@/types/crm";

export default function ContactsTab({
  contacts,
  setContacts,
}: {
  contacts: CRMContact[];
  setContacts: React.Dispatch<React.SetStateAction<CRMContact[]>>;
}) {

  const addContact = () => {
    setContacts([...contacts, {
      name: "",
      email: "",
      phone: "",
      is_primary: false
    }]);
  };

  return (
    <div className="space-y-4">

      <Button
        onClick={addContact}
        variant="add_line"
        // className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        Add Contact
      </Button>

      {contacts.map((c, i) => (
        <div key={i} className="border p-3 rounded grid grid-cols-2 gap-2">

          <input
            placeholder="Name"
            value={c.name}
            onChange={(e)=>{
              const updated = [...contacts];
              updated[i].name = e.target.value;
              setContacts(updated);
            }}
            className="border p-2 rounded"
          />

          <input
            placeholder="Email"
            value={c.email}
            onChange={(e)=>{
              const updated = [...contacts];
              updated[i].email = e.target.value;
              setContacts(updated);
            }}
            className="border p-2 rounded"
          />

        </div>
      ))}

    </div>
  );
}