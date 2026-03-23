// app/components/setup/VatProductPostingGroupsList.tsx

"use client";

import { useEffect, useState } from "react";

type Group = {
  id: string;
  name: string;
};

export default function VatProductPostingGroupsList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch("/api/setup/vat-product-posting-groups");
        const data = await res.json();
        setGroups(data);
      } catch (err) {
        console.error("Failed to load posting groups", err);
      }
    };

    fetchGroups();
  }, []);

  const createOrUpdate = async () => {
    if (!name.trim()) return;

    if (editingId) {
      await fetch(`/api/setup/vat-product-posting-groups/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setEditingId(null);
    } else {
      await fetch("/api/setup/vat-product-posting-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }

    setName("");

    // reload groups after create/update
    const res = await fetch("/api/setup/vat-product-posting-groups");
    const data = await res.json();
    setGroups(data);
  };

  const editGroup = (g: Group) => {
    setEditingId(g.id);
    setName(g.name);
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Delete group?")) return;

    await fetch(`/api/setup/vat-product-posting-groups/${id}`, {
      method: "DELETE",
    });

    const res = await fetch("/api/setup/vat-product-posting-groups");
    const data = await res.json();
    setGroups(data);
  };

  return (
    <div className="p-6 rounded shadow space-y-4">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group Name"
          className="border p-2 rounded flex-1"
        />

        <button
          onClick={createOrUpdate}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {editingId ? "Update" : "Add"}
        </button>
      </div>

      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {groups.map((g) => (
            <tr key={g.id} className="border-t">
              <td className="p-2">{g.name}</td>

              <td className="p-2 text-center space-x-3">
                <button className="text-blue-600" onClick={() => editGroup(g)}>
                  Edit
                </button>

                <button
                  className="text-red-600"
                  onClick={() => deleteGroup(g.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
