// app/components/setup/SetupDataGrid.tsx


"use client";

import { Button } from "@/components/ui/button";
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

export default function SetupDataGrid({
  title,
  api,
  fields,
  columns,
  defaultValues = {},
}: SetupConfig) {
  const [rows, setRows] = useState<Row[]>([]);
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

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
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
      if (!res.ok) throw new Error("Could not retrieve ledger grid records.");
      const json = await res.json();
      setRows(json);
    } catch (error) {
      if (error instanceof Error) setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [api, page, limit, search, sort]);

  const resetForm = () => {
    const initial: Row = {};
    fields.forEach((f) => (initial[f.name] = ""));
    setForm({ ...initial, ...defaultValues });
    setErrorMessage(null);
  };

  const createOrUpdate = async () => {
    for (const f of fields) {
      if (f.required && !form[f.name]) {
        setErrorMessage(
          `Please fill out the required field: ${f.label || f.name}`,
        );
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to commit record entry.");

      resetForm();
      setPage(1);
      await loadData();
    } catch (error) {
      if (error instanceof Error) setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this configuration rule?"))
      return;
    setErrorMessage(null);

    const [baseApi, queryString] = api.split("?");
    const deleteUrl = queryString
      ? `${baseApi}/${id}?${queryString}`
      : `${baseApi}/${id}`;

    try {
      const res = await fetch(deleteUrl, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deletion requests rejected.");

      setPage(1);
      await loadData();
    } catch (error) {
      if (error instanceof Error) setErrorMessage(error.message);
    }
  };

  const startEdit = (row: Row) => {
    setErrorMessage(null);
    setEditingId(row.id!);

    // Build edit form state while matching display names back to raw relational IDs
    const editableState: Row = { ...row };

    fields.forEach((f) => {
      if (f.type === "select") {
        // Look up alternative key formats if the target raw field value is missing
        const structuralKey = f.name.replace("_id", ""); 
        const alternateKey = f.name.replace("vat_", "").replace("_id", "");
        const recordDisplayValue = row[f.name] || row[structuralKey] || row[alternateKey];

        if (recordDisplayValue) {
          // Check if value already matches a functional option code id
          const explicitMatch = f.options?.find(o => o.value === String(recordDisplayValue));
          if (explicitMatch) {
            editableState[f.name] = explicitMatch.value;
          } else {
            // Find option matching display text label
            const labelMatch = f.options?.find(
              o => o.label.toLowerCase() === String(recordDisplayValue).toLowerCase()
            );
            if (labelMatch) {
              editableState[f.name] = labelMatch.value;
            }
          }
        }
      } else if (f.type === "number") {
        // Explicitly patch up naming variation between vat_rate and vat_value keys
        if (f.name === "vat_rate" && row["vat_value"] !== undefined && row["vat_rate"] === undefined) {
          editableState["vat_rate"] = row["vat_value"];
        }
      }
    });

    setEditForm(editableState);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setErrorMessage(null);
  };

  const updateRow = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    const [baseApi, queryString] = api.split("?");
    const updateUrl = queryString
      ? `${baseApi}/${editingId}?${queryString}`
      : `${baseApi}/${editingId}`;

    try {
      const res = await fetch(updateUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...defaultValues, ...editForm }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Matrix record update failure.");

      setEditingId(null);
      setEditForm({});
      setPage(1);
      await loadData();
    } catch (error) {
      if (error instanceof Error) setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border p-6 bg-white dark:bg-slate-900 rounded-lg shadow space-y-4 dark:border-slate-800">
      <h2 className="text-lg font-semibold">{title}</h2>

      {errorMessage && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search table configurations..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={loading}
        className="border p-2 rounded w-full dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
      />

      {/* Grid Inputs Creation Form Panel */}
      <div
        className="grid gap-3 mt-2"
        style={{
          gridTemplateColumns: `repeat(${fields.filter((f) => f.type !== "hidden").length}, minmax(120px, 1fr))`,
        }}
      >
        {fields.map((f) =>
          f.type === "hidden" ? null : f.type === "select" ? (
            <select
              key={f.name}
              value={form[f.name] || ""}
              disabled={submitting}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [f.name]: e.target.value }))
              }
              className="border p-2 rounded dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
            >
              <option value="">Select {f.label || f.name}...</option>
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
              disabled={submitting}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [f.name]: e.target.value }))
              }
              className="border p-2 rounded dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
            />
          ),
        )}
      </div>

      <Button
        onClick={createOrUpdate}
        disabled={submitting || loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-medium transition disabled:opacity-50"
      >
        {submitting ? "Processing..." : "Add Record"}
      </Button>

      {/* Data Layout Grid Elements presentation */}
      {loading && rows.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          Synchronizing registry mappings...
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg dark:border-slate-700">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 capitalize text-xs tracking-wider">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.name}
                    className="p-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 select-none"
                    onClick={() => {
                      if (c.sortable === false) return;
                      setSort((prev) => {
                        if (prev?.field === c.name) {
                          return {
                            field: c.name,
                            direction:
                              prev.direction === "asc" ? "desc" : "asc",
                          };
                        }
                        return { field: c.name, direction: "asc" };
                      });
                    }}
                  >
                    {c.label}{" "}
                    {sort?.field === c.name
                      ? sort.direction === "asc"
                        ? "🔼"
                        : "🔽"
                      : ""}
                  </th>
                ))}
                <th className="p-3 text-center">Operations</th>
              </tr>
            </thead>

            <tbody className="divide-y dark:divide-slate-700">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="p-4 text-center text-gray-400"
                  >
                    No active mappings found in this tenant directory section.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={String(r.id)}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition"
                  >
                    {columns.map((c) => {
                      // Fallback structural check lookup strategies
                      const fieldConfig = fields.find(
                        (f) =>
                          f.name === c.name ||
                          f.name === `vat_${c.name}_id` ||
                          f.name.replace("_id", "") === c.name ||
                          f.name.includes(c.name),
                      );

                      const inputName = fieldConfig?.name || c.name;

                      return (
                        <td key={c.name} className="p-3">
                          {editingId === r.id ? (
                            fieldConfig?.type === "select" ? (
                              <select
                                className="border p-1 w-full dark:bg-slate-800 dark:border-slate-700 rounded"
                                value={editForm[inputName] ?? ""}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    [inputName]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Select...</option>
                                {fieldConfig.options?.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={
                                  fieldConfig?.type === "number"
                                    ? "number"
                                    : "text"
                                }
                                className="border p-1 w-full dark:bg-slate-800 dark:border-slate-700 rounded"
                                value={
                                  editForm[inputName] ?? 
                                  (inputName === "vat_rate" ? editForm["vat_value"] : "") ?? 
                                  ""
                                }
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    [inputName]:
                                      fieldConfig?.type === "number"
                                        ? Number(e.target.value) || ""
                                        : e.target.value,
                                  }))
                                }
                              />
                            )
                          ) : (
                            String(r[c.name] ?? "")
                          )}
                        </td>
                      );
                    })}
                    <td className="p-3 text-center space-x-3 whitespace-nowrap">
                      {editingId === r.id ? (
                        <>
                          <Button
                            onClick={updateRow}
                            disabled={submitting}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={cancelEdit}
                            disabled={submitting}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => startEdit(r)}
                            disabled={submitting}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => remove(r.id!)}
                            disabled={submitting}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls Footer Block */}
      <div className="flex justify-between items-center mt-4 text-xs text-gray-600 dark:text-gray-400">
        <Button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1 || loading}
          className="border px-4 py-1.5 rounded bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:border-slate-700 disabled:opacity-40 transition"
        >
          Previous
        </Button>
        <span className="font-medium">Page {page}</span>
        <Button
          onClick={() => setPage((p) => p + 1)}
          disabled={rows.length < limit || loading}
          className="border px-4 py-1.5 rounded bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:border-slate-700 disabled:opacity-40 transition"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
