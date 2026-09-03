// app/components/setup/PostingGroupsList.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type PostingGroup = {
  id: string;
  name: string;
};

export default function PostingGroupsList() {

  return (<></>);
  /* const [groups, setGroups] = useState<PostingGroup[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load groups properly inside useEffect
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch("/api/setup/posting-groups");
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
      await fetch(`/api/setup/posting-groups/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setEditingId(null);
    } else {
      await fetch("/api/setup/posting-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }

    setName("");
    // reload groups after create/update
    const res = await fetch("/api/setup/posting-groups");
    const data = await res.json();
    setGroups(data);
  };

  const editGroup = (g: PostingGroup) => {
    setEditingId(g.id);
    setName(g.name);
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Delete posting group?")) return;
    await fetch(`/api/setup/posting-groups/${id}`, { method: "DELETE" });
    const res = await fetch("/api/setup/posting-groups");
    const data = await res.json();
    setGroups(data);
  };

  return (
    <div className=" rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm  p-4 space-y-4">

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="border p-2 rounded flex-1"
        />
        <Button
          onClick={createOrUpdate}
          // className="bg-blue-600 text-white px-4 py-2 rounded"
          variant="add_line"
        >
          {editingId ? "Update" : "Add"}
        </Button>
      </div>


      <table className="w-full border text-xs">
        <thead className="">
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
                <Button
                  variant="edit"
                  onClick={() => editGroup(g)}
                >
                  Edit
                </Button>
                <Button
                  variant="cancel"
                  onClick={() => deleteGroup(g.id)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );*/
} 