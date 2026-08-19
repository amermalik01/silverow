// app/components/hr/departments/DepartmentList.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type Department = {
  id: string;
  code: string;
  name: string;
  description?: string;
  status?: string;
  created_at?: string;
};

export default function DepartmentList() {
  const [data, setData] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const loadData = async () => {
    try {
      const res = await fetch("/api/hr/departments");
      const result = await res.json();
      setData(result || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/api/hr/departments");
        const result = await res.json();
        setData(result || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, []);

  const save = async () => {
    await fetch("/api/hr/departments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        name,
        description,
      }),
    });

    setName("");
    setDescription("");
    loadData();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete department?")) return;

    await fetch(`/api/hr/departments/${id}`, {
      method: "DELETE",
    });

    loadData();
  };

  return (
    <div className="space-y-6 rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm container mx-auto p-4">
      <div className="border rounded p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Department Name"
          className="border p-2 rounded"
        />

        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="border p-2 rounded"
        />

        <Button onClick={save} className="bg-blue-600 text-white rounded px-4">
          Save
        </Button>
      </div>

      <table className="w-full border text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left">Code</th>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {data?.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-2">{row.code}</td>
              <td className="p-2">{row.name}</td>
              <td className="p-2">{row.description}</td>
              <td className="p-2 text-center">
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
