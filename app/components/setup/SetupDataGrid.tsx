// app/components/setup/SetupDataGrid.tsx

"use client";

import { useEffect, useState } from "react";

export type Field = {
  name: string;
  label?: string;
  type?: "text" | "select" | "number" | "hidden";
  options?: { value: string; label: string }[];
  required?: boolean;
};

export type Column = {
  name: string;
  label: string;
  sortable?: boolean;
};

type Row = Record<string, string | number | undefined>;

export type SetupConfig = {
  title: string;
  api: string;
  fields: Field[];
  columns: Column[];
  defaultValues?: Record<string, string | number>;
};

type Props = SetupConfig;

// type Props = {
//   title: string;
//   api: string;
//   fields: Field[];
//   columns: Column[];
//   defaultValues?: Record<string, string | number>;
// };

export default function SetupDataGrid({
  title,
  api,
  fields,
  columns,
  defaultValues = {},
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  // const [form, setForm] = useState<Row>(() =>
  //   fields.reduce((acc, f) => {
  //     acc[f.name] = "";
  //     return acc;
  //   }, {} as Row),
  // );

  const [form, setForm] = useState<Row>(() => {
    const initial: Row = {};

    fields.forEach((f) => {
      initial[f.name] = "";
    });

    return { ...initial, ...defaultValues };
  });

  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<Row>({});

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{
    field: string;
    direction: "asc" | "desc";
  } | null>(null);

  const loadData = async () => {
    const query = new URLSearchParams();

    query.set("page", page.toString());
    query.set("limit", limit.toString());

    if (search) query.set("search", search);

    if (sort) {
      query.set("sortField", sort.field);
      query.set("sortDirection", sort.direction);
    }

    const separator = api.includes("?") ? "&" : "?";

    const res = await fetch(`${api}${separator}${query.toString()}`);
    const json = await res.json();

    setRows(json);
  };

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

      // const res = await fetch(`${api}?${query.toString()}`);
      const separator = api.includes("?") ? "&" : "?";
      const res = await fetch(`${api}${separator}${query.toString()}`);

      const data: Row[] = await res.json();

      // if (!ignore) setRows(data.rows ?? data);
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
    await loadData();
  };

  const remove = async (id: string | number) => {
    if (!confirm("Delete record?")) return;

    // await fetch(`${api}/${id}`, { method: "DELETE" });
    const [baseApi, queryString] = api.split("?");

    const deleteUrl = queryString
      ? `${baseApi}/${id}?${queryString}`
      : `${baseApi}/${id}`;

    await fetch(deleteUrl, { method: "DELETE" });

    setPage(1); // refresh after delete
    await loadData();
  };

  const startEdit = (row: Row) => {
    setEditingId(row.id!);
    setEditForm(row);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const updateRow = async () => {
    const [baseApi, queryString] = api.split("?");

    const updateUrl = queryString
      ? `${baseApi}/${editingId}?${queryString}`
      : `${baseApi}/${editingId}`;

    await fetch(updateUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...defaultValues,
        ...editForm,
      }),
    });

    setEditingId(null);
    setEditForm({});
    setPage(1);
    await loadData();
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
          f.type === "hidden" ? null : f.type === "select" ? (
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
          ),
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
                      return {
                        field: c.name,
                        direction: prev.direction === "asc" ? "desc" : "asc",
                      };
                    return { field: c.name, direction: "asc" };
                  })
                }
              >
                {c.label}
                {sort?.field === c.name
                  ? sort.direction === "asc"
                    ? " 🔼"
                    : " 🔽"
                  : ""}
              </th>
            ))}
            <th className="p-2 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={String(r.id)} className="border-t">
              {/* {columns.map((c) => (
                <td key={c.name} className="p-2">
                  {r[c.name] ?? ""}
                </td>
              ))} */}
              {columns.map((c) => (
                <td key={c.name} className="p-2">
                  {editingId === r.id ? (
                    <input
                      className="border p-1 w-full"
                      value={editForm[c.name] ?? ""}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          [c.name]: e.target.value,
                        }))
                      }
                    />
                  ) : (
                    (r[c.name] ?? "")
                  )}
                </td>
              ))}
              <td className="p-2 text-center space-x-2">
                {editingId === r.id ? (
                  <>
                    <button onClick={updateRow} className="text-green-600">
                      Save
                    </button>

                    <button onClick={cancelEdit} className="text-gray-600">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(r)}
                      className="text-blue-600"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => remove(r.id!)}
                      className="text-red-600"
                    >
                      Delete
                    </button>
                  </>
                )}

                {/* <button onClick={() => remove(r.id!)} className="text-red-600">
                  Delete
                </button> */}
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
