// app/components/setup/SetupDataGrid.tsx

"use client";

import { useEffect, useState } from "react";

type Field = {
  name: string;
  label: string;
  type?: "text" | "select" | "number";
  options?: { value: string; label: string }[];
  required?: boolean;
};

type Column = {
  name: string;
  label: string;
  sortable?: boolean;
};

type Row = Record<string, string | number | undefined>;

type Props = {
  title: string;
  api: string;
  fields: Field[];
  columns: Column[];
};

export default function SetupDataGrid({ title, api, fields, columns }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Row>(() =>
    fields.reduce((acc, f) => {
      acc[f.name] = "";
      return acc;
    }, {} as Row)
  );

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ field: string; direction: "asc" | "desc" } | null>(null);

  // Load rows async safely
  useEffect(() => {
    let ignore = false;

    const fetchRows = async () => {
      const query = new URLSearchParams();
      query.set("page", page.toString());
      query.set("limit", limit.toString());
      if (search) query.set("search", search);
      if (sort) {
        query.set("sortField", sort.field);
        query.set("sortDirection", sort.direction);
      }

      const res = await fetch(`${api}?${query.toString()}`);
      const data: Row[] = await res.json();

      if (!ignore) setRows(data);
    };

    fetchRows();

    return () => {
      ignore = true;
    };
  }, [api, page, limit, search, sort]);

  const resetForm = () => {
    const initial: Row = {};
    fields.forEach((f) => (initial[f.name] = ""));
    setForm(initial);
  };

  const createOrUpdate = async () => {
    // Validation
    for (const f of fields) {
      if (f.required && !form[f.name]) {
        alert(`Please fill ${f.label}`);
        return;
      }
    }

    await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    resetForm();
    setPage(1); // refresh from first page
  };

  const remove = async (id: string | number) => {
    if (!confirm("Delete record?")) return;

    await fetch(`${api}/${id}`, { method: "DELETE" });
    setPage(1); // refresh after delete
  };

  return (
    <div className="border p-6 rounded space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>

      {/* Search */}
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 rounded w-full"
      />

      {/* Form */}
      <div
        className="grid gap-3 mt-2"
        style={{ gridTemplateColumns: `repeat(${fields.length}, 1fr)` }}
      >
        {fields.map((f) =>
          f.type === "select" ? (
            <select
              key={f.name}
              value={form[f.name] || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [f.name]: e.target.value }))
              }
              className="border p-2 rounded"
            >
              <option value="">{f.label}</option>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              key={f.name}
              type={f.type || "text"}
              placeholder={f.label}
              value={form[f.name] || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [f.name]: e.target.value }))
              }
              className="border p-2 rounded"
            />
          )
        )}
      </div>

      <button
        onClick={createOrUpdate}
        className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
      >
        Add
      </button>

      {/* Table */}
      <table className="w-full border text-sm mt-4">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.name}
                className="p-2 text-left cursor-pointer"
                onClick={() =>
                  setSort((prev) => {
                    if (prev?.field === c.name)
                      return { field: c.name, direction: prev.direction === "asc" ? "desc" : "asc" };
                    return { field: c.name, direction: "asc" };
                  })
                }
              >
                {c.label}
                {sort?.field === c.name ? (sort.direction === "asc" ? " 🔼" : " 🔽") : ""}
              </th>
            ))}
            <th className="p-2 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={String(r.id)} className="border-t">
              {columns.map((c) => (
                <td key={c.name} className="p-2">
                  {r[c.name] ?? ""}
                </td>
              ))}
              <td className="p-2 text-center">
                <button
                  onClick={() => remove(r.id!)}
                  className="text-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-between mt-2">
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          className="border px-3 py-1 rounded"
        >
          Prev
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="border px-3 py-1 rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* "use client";

import { useEffect, useState } from "react";

type Field = {
  name: string;
  label: string;
  type?: "text" | "select" | "number";
  options?: { value: string; label: string }[];
  required?: boolean;
};

type Column = {
  name: string;
  label: string;
  sortable?: boolean;
};


type Row = Record<string, string | number | undefined>;

type Props = {
  title: string;
  api: string;
  fields: Field[];
  columns: Column[];
  pageSize?: number;
};

export default function SetupDataGrid({
  title,
  api,
  fields,
  columns,
  pageSize = 10,
}: Props) {

    const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Row>(() =>
    fields.reduce((acc, f) => {
      acc[f.name] = "";
      return acc;
    }, {} as Row)
  );

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
//   const [sort, setSort] = useState<{ field: string; direction: "asc" | "desc" } | null>(null);



  

  const [editingId, setEditingId] = useState<string | null>(null);


  const [sort, setSort] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Initialize form
  // Load rows async safely
  useEffect(() => {
    let ignore = false;

    const fetchRows = async () => {
      const query = new URLSearchParams();
      query.set("page", page.toString());
      query.set("limit", limit.toString());
      if (search) query.set("search", search);
      if (sort) {
        query.set("sortField", sort.field);
        query.set("sortDirection", sort.direction);
      }

      const res = await fetch(`${api}?${query.toString()}`);
      const data: Row[] = await res.json();

      if (!ignore) setRows(data);
    };

    fetchRows();

    return () => {
      ignore = true;
    };
  }, [api, page, limit, search, sort]);

  const resetForm = () => {
    const initial: Row = {};
    fields.forEach((f) => (initial[f.name] = ""));
    setForm(initial);
  };

  const createOrUpdate = async () => {
    // Validation
    for (const f of fields) {
      if (f.required && !form[f.name]) {
        alert(`Please fill ${f.label}`);
        return;
      }
    }

    await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    resetForm();
    setPage(1); // refresh from first page
  };

  const remove = async (id: string | number) => {
    if (!confirm("Delete record?")) return;

    await fetch(`${api}/${id}`, { method: "DELETE" });
    setPage(1); // refresh after delete
  };

  // Validate form
  const validate = () => {
    for (const f of fields) {
      if (f.required && (form[f.name] === "" || form[f.name] === undefined)) {
        alert(`${f.label} is required`);
        return false;
      }
    }
    return true;
  };

  // Create / Update
  const save = async () => {
    if (!validate()) return;

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `${api}/${editingId}` : api;

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    // Reset form
    const reset: Record<string, string | number> = {};
    fields.forEach((f) => (reset[f.name] = ""));
    setForm(reset);
    setEditingId(null);

    load();
  };

  // Delete
  const remove = async (id: string) => {
    if (!confirm("Delete record?")) return;

    await fetch(`${api}/${id}`, { method: "DELETE" });
    load();
  };

  // Edit row
  const editRow = (row: Row) => {
    const initial: Record<string, string | number> = {};
    fields.forEach((f) => (initial[f.name] = row[f.name] ?? ""));
    setForm(initial);
    setEditingId(String(row.id));
  };

  // Sort handler
  const handleSort = (col: Column) => {
    if (!col.sortable) return;

    if (sort?.key === col.name) {
      setSort({
        key: col.name,
        direction: sort.direction === "asc" ? "desc" : "asc",
      });
    } else {
      setSort({ key: col.name, direction: "asc" });
    }
  };

  // Pagination
  const totalPages = Math.ceil(rows.length / pageSize);

  const displayedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="border p-6 rounded space-y-4">
      <h2 className="text-xl font-bold">{title}</h2>


      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="border p-2 rounded w-full mb-4"
      />


      <div
        className="grid gap-3 mb-4"
        style={{ gridTemplateColumns: `repeat(${fields.length}, 1fr)` }}
      >
        {fields.map((f) => {
          if (f.type === "select") {
            return (
              <select
                key={f.name}
                value={form[f.name] || ""}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                className="border p-2 rounded"
              >
                <option value="">{f.label}</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            );
          }

          return (
            <input
              key={f.name}
              type={f.type || "text"}
              placeholder={f.label}
              value={form[f.name] || ""}
              onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              className="border p-2 rounded"
            />
          );
        })}
      </div>

      <button
        onClick={save}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        {editingId ? "Update" : "Add"}
      </button>


      <table className="w-full border text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.name}
                className="p-2 text-left cursor-pointer select-none"
                onClick={() => handleSort(c)}
              >
                {c.label}{" "}
                {sort?.key === c.name
                  ? sort.direction === "asc"
                    ? "↑"
                    : "↓"
                  : ""}
              </th>
            ))}
            <th className="p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayedRows.map((r) => (
            <tr key={String(r.id)} className="border-t">
              {columns.map((c) => (
                <td key={c.name} className="p-2">
                  {String(r[c.name] ?? "")}
                </td>
              ))}
              <td className="p-2 text-center space-x-2">
                <button onClick={() => editRow(r)} className="text-blue-600">
                  Edit
                </button>
                <button
                  onClick={() => remove(String(r.id))}
                  className="text-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>


      {totalPages > 1 && (
        <div className="flex gap-2 justify-center mt-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="border px-3 py-1 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-2 py-1">
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="border px-3 py-1 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
 */