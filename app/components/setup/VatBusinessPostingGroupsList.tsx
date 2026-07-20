// app/components/setup/VatBusinessPostingGroupsList.tsx

"use client";

import { useEffect, useState } from "react";

type Group = {
  id: string;
  name: string;
};

export default function VatBusinessPostingGroupsList() {
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
      const res = await fetch("/api/setup/vat-business-posting-groups");
      if (!res.ok)
        throw new Error("Could not populate groups data repository.");
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        // Fallback handle for obscure unexpected errors
        setErrorMsg("An unexpected operation failure occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName || cleanName.length > 100) {
      setErrorMsg(
        "Group designation must range between 1 and 100 printable characters.",
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const url = editingId
      ? `/api/setup/vat-business-posting-groups/${editingId}`
      : "/api/setup/vat-business-posting-groups";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Transaction modification exception.");

      setName("");
      setEditingId(null);
      await fetchGroups();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        // Fallback handle for obscure unexpected errors
        setErrorMsg("An unexpected operation failure occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (g: Group) => {
    setErrorMsg(null);
    setEditingId(g.id);
    setName(g.name);
  };

  const clearForm = () => {
    setEditingId(null);
    setName("");
    setErrorMsg(null);
  };

  const deleteGroup = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this VAT Business Posting Group?",
      )
    )
      return;
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/setup/vat-business-posting-groups/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action execution blocked.");
      await fetchGroups();
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        // Fallback handle for obscure unexpected errors
        setErrorMsg("An unexpected operation failure occurred.");
      }
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-lg shadow space-y-4">
      {errorMsg && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded text-xs font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          placeholder="Group Identifier Name (e.g. Domestic Trader, EU Import)"
          className="border p-2 rounded flex-1 dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-medium transition disabled:opacity-50"
        >
          {submitting ? "Saving..." : editingId ? "Update" : "Add Group"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={clearForm}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        )}
      </form>

      {loading ? (
        <div className="text-center py-4 text-gray-500">
          Loading elements...
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg dark:border-slate-700">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700">
              <tr>
                <th className="p-3">Posting Classification Group Name</th>
                <th className="p-3 text-center">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-4 text-center text-gray-400">
                    No custom business classifications configured.
                  </td>
                </tr>
              ) : (
                groups.map((g) => (
                  <tr
                    key={g.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                  >
                    <td className="p-3 font-medium">{g.name}</td>
                    <td className="p-3 text-center space-x-4">
                      <button
                        onClick={() => startEdit(g)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteGroup(g.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
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

/* "use client";

import { useEffect, useState } from "react";

type Group = {
  id: string;
  name: string;
};

export default function VatBusinessPostingGroupsList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load groups properly inside useEffect
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch("/api/setup/vat-business-posting-groups");
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
      await fetch(`/api/setup/vat-business-posting-groups/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setEditingId(null);
    } else {
      await fetch("/api/setup/vat-business-posting-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }

    setName("");

    // reload groups after create/update
    const res = await fetch("/api/setup/vat-business-posting-groups");
    const data = await res.json();
    setGroups(data);
  };

  const editGroup = (g: Group) => {
    setEditingId(g.id);
    setName(g.name);
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Delete group?")) return;

    await fetch(`/api/setup/vat-business-posting-groups/${id}`, {
      method: "DELETE",
    });

    const res = await fetch("/api/setup/vat-business-posting-groups");
    const data = await res.json();
    setGroups(data);
  };

  return (
    <div className="p-6 rounded shadow dark:shadow-white space-y-4">
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

      <table className="w-full border text-xs">
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
                <button
                  className="text-blue-600"
                  onClick={() => editGroup(g)}
                >
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
} */
