// app/components/setup/sales/DropdownManager.tsx
"use client";

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

export default function DropdownManager({ slug, type, module="sales" }: DropdownManagerProps) {

  const [data, setData] = useState<DropdownItem[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(
        `/api/setup/sales/${type}?module=${module}`
      );

      const json: DropdownItem[] = await res.json();
      setData(json);
    };

    fetchData();
  }, [slug, type]);

  const createItem = async () => {
    await fetch(`/api/setup/sales/${type}`, {
      method: "POST",
      body: JSON.stringify({
        name,
        module: module
      }),
    });

    setName("");

    const res = await fetch(
      `/api/setup/sales/${type}?module=${module}`
    );
    const json: DropdownItem[] = await res.json();
    setData(json);
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/setup/sales/${type}/${id}`, {
      method: "DELETE",
    });

    const res = await fetch(
      `/api/setup/sales/${type}?module=${module}`
    );
    const json: DropdownItem[] = await res.json();
    setData(json);
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
            {item.name}

            <button
              onClick={() => deleteItem(item.id)}
              style={{ marginLeft: 10 }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
} */
