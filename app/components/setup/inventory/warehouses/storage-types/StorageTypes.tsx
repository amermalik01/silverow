// app/components/setup/inventory/warehouses/storage-types/StorageTypes.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type StorageType = {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: number;
  company_id: string | null;
};

export default function StorageTypes() {
  const [data, setData] = useState<StorageType[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  // ---------------- FETCH ----------------
  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/setup/warehouse-storage-types");
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await fetch("/api/setup/warehouse-storage-types");
      const json = await res.json();
      setData(json);
      setLoading(false);
    };
    fetchData();
  }, []);

  // ---------------- SAVE (CREATE / UPDATE) ----------------
  const save = async () => {
    const url = editingId
      ? `/api/setup/warehouse-storage-types/${editingId}`
      : "/api/setup/warehouse-storage-types";

    const method = editingId ? "PUT" : "POST";

    await fetch(url, {
      method,
      body: JSON.stringify(form),
    });

    setForm({ code: "", name: "", description: "" });
    setEditingId(null);
    fetchData();
  };

  // ---------------- EDIT ----------------
  const startEdit = (item: StorageType) => {
    setForm({
      code: item.code,
      name: item.name,
      description: item.description || "",
    });
    setEditingId(item.id);
  };

  // ---------------- DELETE ----------------
  const remove = async (id: string) => {
    if (!confirm("Delete this storage type?")) return;

    await fetch(`/api/setup/warehouse-storage-types/${id}`, {
      method: "DELETE",
    });

    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* ================= FORM ================= */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h2 className="font-semibold mb-3">
          {editingId ? "Update Storage Type" : "Add Storage Type"}
        </h2>

        <div className="grid grid-cols-3 gap-3">
          <input
            className="border p-2 rounded"
            placeholder="Code (e.g. COLD)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />

          <input
            className="border p-2 rounded"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            className="border p-2 rounded"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            onClick={save}
            variant="save"
          >
            {editingId ? "Update" : "Create"}
          </Button>

          {editingId && (
            <Button
              onClick={() => {
                setEditingId(null);
                setForm({ code: "", name: "", description: "" });
              }}
              variant="cancel"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-xs table-fixed">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Scope</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No storage types found
                </td>
              </tr>
            )}

            {data.map((item) => (
              <tr
                key={item.id}
                className="border-t hover:bg-gray-50 transition"
              >
                <td className="p-3 font-mono">{item.code}</td>

                <td className="p-3 font-medium">{item.name}</td>

                <td className="p-3 text-gray-500">{item.description || "-"}</td>

                {/* GLOBAL vs COMPANY */}
                <td className="p-3">
                  {item.company_id ? (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Company
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                      Global
                    </span>
                  )}
                </td>

                <td className="p-3 flex gap-3">
                  <Button
                    onClick={() => startEdit(item)}
                    variant="edit"
                  >
                    Edit
                  </Button>

                  {/* Prevent deleting global if needed */}
                  <Button
                    onClick={() => remove(item.id)}
                    variant="cancel"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
