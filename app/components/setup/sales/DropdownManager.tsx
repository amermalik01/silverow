// app/components/setup/sales/DropdownManager.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";

interface DropdownManagerProps {
  slug: string;
  type: string;
  module?: string;
}

interface DropdownItem {
  id: string;
  name: string;
}

export default function DropdownManager({
  slug,
  type,
  module = "sales",
}: DropdownManagerProps) {
  const [data, setData] = useState<DropdownItem[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const reloadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/setup/sales/${type}?module=${module}`);
      if (res.ok) {
        const json: DropdownItem[] = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load drop-down metrics list:", err);
    }
  }, [type, module]);

  useEffect(() => {
    let isMounted = true;

    async function fetchDropdownData() {
      try {
        const res = await fetch(`/api/setup/sales/${type}?module=${module}`);
        if (res.ok && isMounted) {
          const json: DropdownItem[] = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(
          "Failed to load drop-down metrics list inside effect:",
          err,
        );
      }
    }

    fetchDropdownData();

    return () => {
      isMounted = false;
    };
  }, [type, module, slug]);

  const createItem = async () => {
    if (!name.trim()) return;

    await fetch(`/api/setup/sales/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, module }),
    });

    setName("");
    reloadData();
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/setup/sales/${type}/${id}`, { method: "DELETE" });
    reloadData();
  };

  const updateItem = async (id: string) => {
    if (!editValue.trim()) return;

    await fetch(`/api/setup/sales/${type}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editValue, module }),
    });

    setEditingId(null);
    setEditValue("");
    reloadData();
  };

  return (
    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
      <h2 className="text-base font-bold capitalize mb-4 text-slate-900 dark:text-white">
        Configure {type.replace(/_/g, " ")} ({module})
      </h2>

      <div className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter configuration name..."
          className="p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
        />
        <button
          onClick={createItem}
          className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition"
        >
          Add Item
        </button>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
        {data.map((item) => (
          <li
            key={item.id}
            className="py-2.5 flex items-center justify-between text-xs"
          >
            {editingId === item.id ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="p-1 border rounded dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
                <button
                  onClick={() => updateItem(item.id)}
                  className="text-xs text-emerald-600 font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs text-slate-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {item.name}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setEditValue(item.name);
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
/* "use client";

import { useEffect, useState } from "react";

interface DropdownManagerProps {
  slug: string;
  type: string;
  module?: string;
}

interface DropdownItem {
  id: string;
  name: string;
}

export default function DropdownManager({
  slug,
  type,
  module = "sales",
}: DropdownManagerProps) {
  const [data, setData] = useState<DropdownItem[]>([]);
  const [name, setName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const loadData = async () => {
    const res = await fetch(`/api/setup/sales/${type}?module=${module}`);
    const json: DropdownItem[] = await res.json();
    setData(json);
  };

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/api/setup/sales/${type}?module=${module}`);

      const json: DropdownItem[] = await res.json();
      setData(json);
    };

    fetchData();
  }, [slug, type]);

  const createItem = async () => {
    if (!name.trim()) return;

    await fetch(`/api/setup/sales/${type}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, module }),
    });

    setName("");
    loadData();
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/setup/sales/${type}/${id}`, {
      method: "DELETE",
    });

    loadData();
  };

  const startEdit = (item: DropdownItem) => {
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const updateItem = async (id: string) => {
    if (!editValue.trim()) return;

    await fetch(`/api/setup/sales/${type}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: editValue,
        module: module,
      }),
    });

    setEditingId(null);
    setEditValue("");
    loadData();
  };

  return (
    <div>
      <h2>{type.replace("_", " ")}</h2>

      <div style={{ marginBottom: 20 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New item"
        />

        <button onClick={createItem}>Add</button>
      </div>

      <ul>
        {data.map((item) => (
          <li key={item.id}>
            {editingId === item.id ? (
              <>
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />

                <button onClick={() => updateItem(item.id)}>Save</button>

                <button onClick={cancelEdit}>Cancel</button>
              </>
            ) : (
              <>
                {item.name}

                <button
                  onClick={() => startEdit(item)}
                  style={{ marginLeft: 10 }}
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteItem(item.id)}
                  style={{ marginLeft: 10 }}
                >
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
} */
