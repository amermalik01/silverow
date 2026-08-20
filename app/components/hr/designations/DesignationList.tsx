// app/components/hr/designations/DesignationList.tsx

"use client";

import { useEffect, useState } from "react";

import { Designation } from "@/types/hr/designation";
import { Button } from "@/components/ui/button";

export default function DesignationList() {
  const [data, setData] = useState<Designation[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [status, setStatus] = useState("active");

  useEffect(() => {
    const loadData = async () => {
      const res = await fetch("/api/hr/designations");

      const json = await res.json();

      setData(json.data || []);
    };
    loadData();
  }, []);

  const loadData = async () => {
    const res = await fetch("/api/hr/designations");

    const json = await res.json();

    setData(json.data || []);
  };

  const resetForm = () => {
    setEditingId(null);

    setName("");

    setDescription("");

    setStatus("active");
  };

  const save = async () => {
    const payload = {
      name,
      description,
      status,
    };

    if (editingId) {
      await fetch(`/api/hr/designations/${editingId}`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/hr/designations", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });
    }

    resetForm();

    loadData();
  };

  const edit = (row: Designation) => {
    setEditingId(row.id || null);

    setName(row.name);

    setDescription(row.description || "");

    setStatus(row.status || "active");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete designation?")) return;

    await fetch(`/api/hr/designations/${id}`, {
      method: "DELETE",
    });

    loadData();
  };

  return (
    <div className="space-y-6 rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm container mx-auto p-4">
      {/* FORM */}

      <div className="border rounded p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Designation Name"
          className="border p-2 rounded"
        />

        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="border p-2 rounded"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="active">Active</option>

          <option value="inactive">Inactive</option>
        </select>

        <Button onClick={save} variant="save">
          {editingId ? "Update" : "Create"}
        </Button>
      </div>

      {/* TABLE */}

      <table className="w-full border text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left">Code</th>

            <th className="p-2 text-left">Name</th>

            <th className="p-2 text-left">Description</th>

            <th className="p-2 text-left">Status</th>

            <th className="p-2 text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-2">{row.code}</td>

              <td className="p-2">{row.name}</td>

              <td className="p-2">{row.description}</td>

              <td className="p-2">{row.status}</td>

              <td className="p-2 text-center space-x-2">
                <Button onClick={() => edit(row)} variant="edit">
                  Edit
                </Button>

                <Button
                  onClick={() => remove(row.id!)}
                  className="text-red-600"
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
