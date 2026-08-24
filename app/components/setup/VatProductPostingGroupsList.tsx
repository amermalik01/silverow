// app/components/setup/VatProductPostingGroupsList.tsx

"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type Group = {
  id: string;
  name: string;
};

export default function VatProductPostingGroupsList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchGroups = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/setup/vat-product-posting-groups");
      if (!res.ok) throw new Error("Failed to populate groups data.");
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      if (err instanceof Error) setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const createOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg("Group name cannot be left empty.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const url = editingId ? `/api/setup/vat-product-posting-groups/${editingId}` : "/api/setup/vat-product-posting-groups";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Execution error encountered.");

      setName("");
      setEditingId(null);
      await fetchGroups();
    } catch (err) {
      if (err instanceof Error) setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const editGroup = (g: Group) => {
    setErrorMsg(null);
    setEditingId(g.id);
    setName(g.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setErrorMsg(null);
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Delete product group configuration row?")) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/setup/vat-product-posting-groups/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete call failed.");
      await fetchGroups();
    } catch (err) {
      if (err instanceof Error) setErrorMsg(err.message);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-lg shadow space-y-4">
      {errorMsg && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded text-xs font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={createOrUpdate} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          placeholder="Product Group Name (e.g. RETAIL, SERVICE, EXEMPT)"
          className="border p-2 rounded flex-1 dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
        />

        <Button
          type="submit"
          disabled={submitting}
          variant="save"
          // className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-medium transition disabled:opacity-50"
        >
          {submitting ? "Saving..." : editingId ? "Update" : "Add"}
        </Button>

        {editingId && (
          <Button
            type="button"
            onClick={cancelEdit}
            variant="cancel"
          >
            Cancel
          </Button>
        )}
      </form>

      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading elements...</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg dark:border-slate-700">
          <table className="w-full text-xs table-fixed text-left">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 capitalize text-xs tracking-wider">
              <tr>
                <th className="p-3">Product Posting Group Name</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-4 text-center text-gray-400">No product combinations configured.</td>
                </tr>
              ) : (
                groups.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                    <td className="p-3 font-medium">{g.name}</td>
                    <td className="p-3 text-center space-x-3">
                      <Button
                        onClick={() => editGroup(g)}
                        variant="edit"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => deleteGroup(g.id)}
                        variant="cancel"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
