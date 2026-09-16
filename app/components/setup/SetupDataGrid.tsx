// app/components/setup/SetupDataGrid.tsx

"use client";

import { useCallback, useEffect, useState } from "react";

import SetupDataGridHeader from "./SetupDataGridHeader";
import SetupDataGridError from "./SetupDataGridError";
import SetupDataGridForm from "./SetupDataGridForm";
import SetupDataGridTable from "./SetupDataGridTable";

import type {
  Column,
  Field,
  Row,
  SetupConfig,
  SortState,
} from "./setupDataGrid.types";

export type { Column, Field, Row, SetupConfig };

/* =========================================================
   Helper Types
   ========================================================= */

type ApiResponse = {
  error?: string;
  message?: string;
  data?: unknown;
  rows?: unknown;
};

/* =========================================================
   Component
   ========================================================= */

export default function SetupDataGrid({
  title,
  api,
  fields,
  columns,
  defaultValues = {},
}: SetupConfig) {
  /* =======================================================
     Initial Form
     ======================================================= */

  const createInitialForm = useCallback((): Row => {
    const initial: Row = {};

    fields.forEach((field) => {
      initial[field.name] = "";
    });

    return {
      ...initial,
      ...defaultValues,
    };
  }, [fields, defaultValues]);

  /* =======================================================
     State
     ======================================================= */

  const [rows, setRows] = useState<Row[]>([]);

  const [form, setForm] = useState<Row>(() => createInitialForm());

  const [editingId, setEditingId] = useState<string | number | null>(null);

  const [editForm, setEditForm] = useState<Row>({});

  const [page, setPage] = useState(1);

  const limit = 20;

  const [search, setSearch] = useState("");

  const [sort, setSort] = useState<SortState>(null);

  const [loading, setLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* =======================================================
     Build List URL
     ======================================================= */

  const buildListUrl = useCallback(() => {
    const query = new URLSearchParams();

    query.set("page", page.toString());
    query.set("limit", limit.toString());

    if (search.trim()) {
      query.set("search", search.trim());
    }

    if (sort) {
      query.set("sortField", sort.field);
      query.set("sortDirection", sort.direction);
    }

    const separator = api.includes("?") ? "&" : "?";

    return `${api}${separator}${query.toString()}`;
  }, [api, page, search, sort]);

  /* =======================================================
     Load Data
     ======================================================= */

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);

      try {
        const res = await fetch(buildListUrl(), {
          method: "GET",
          cache: "no-store",
          signal,
        });

        if (!res.ok) {
          let message = "Could not retrieve configuration records.";

          try {
            const errorData: ApiResponse = await res.json();

            message = errorData.error || errorData.message || message;
          } catch {
            // Ignore invalid/empty JSON response.
          }

          throw new Error(message);
        }

        const json: unknown = await res.json();

        if (signal?.aborted) {
          return;
        }

        /*
         * Support all of these API response formats:
         *
         * [
         *   {...}
         * ]
         *
         * {
         *   data: [...]
         * }
         *
         * {
         *   rows: [...]
         * }
         */

        if (Array.isArray(json)) {
          setRows(json as Row[]);
        } else if (
          typeof json === "object" &&
          json !== null &&
          "data" in json &&
          Array.isArray((json as { data?: unknown }).data)
        ) {
          setRows((json as { data: Row[] }).data);
        } else if (
          typeof json === "object" &&
          json !== null &&
          "rows" in json &&
          Array.isArray((json as { rows?: unknown }).rows)
        ) {
          setRows((json as { rows: Row[] }).rows);
        } else {
          setRows([]);
        }

        setErrorMessage(null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (signal?.aborted) {
          return;
        }

        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            "An unexpected error occurred while loading records.",
          );
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [buildListUrl],
  );

  /* =======================================================
     Load when API / Search / Page / Sort changes
     ======================================================= */

  useEffect(() => {
    const controller = new AbortController();

    void loadData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadData]);

  /* =======================================================
     Reset Add Form
     ======================================================= */

  const resetForm = useCallback(() => {
    setForm(createInitialForm());
    setErrorMessage(null);
  }, [createInitialForm]);

  /* =======================================================
     Form Change
     ======================================================= */

  const handleFormChange = useCallback(
    (name: string, value: string | number) => {
      setForm((previous) => ({
        ...previous,
        [name]: value,
      }));
    },
    [],
  );

  /* =======================================================
     Edit Form Change
     ======================================================= */

  const handleEditFormChange = useCallback(
    (name: string, value: string | number) => {
      setEditForm((previous) => ({
        ...previous,
        [name]: value,
      }));
    },
    [],
  );

  /* =======================================================
     Validate Form
     ======================================================= */

  const validateForm = useCallback(
    (values: Row): boolean => {
      for (const field of fields) {
        if (!field.required) {
          continue;
        }

        const value = values[field.name];

        if (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        ) {
          setErrorMessage(
            `Please fill out the required field: ${field.label || field.name}.`,
          );

          return false;
        }
      }

      return true;
    },
    [fields],
  );

  /* =======================================================
     Create Record
     ======================================================= */

  const createRecord = async () => {
    if (!validateForm(form)) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      let data: ApiResponse = {};

      try {
        data = await res.json();
      } catch {
        // Empty response is allowed.
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to create the configuration record.",
        );
      }

      resetForm();

      /*
       * Return to first page after creating.
       */
      setPage(1);

      /*
       * Refresh records.
       *
       * Note:
       * If the current page is already page 1,
       * this refreshes immediately.
       *
       * If page changes to 1, the useEffect above
       * will also refresh because its dependency changes.
       */
      if (page === 1) {
        await loadData();
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to create the configuration record.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     Delete Record
     ======================================================= */

  const deleteRecord = async (id: string | number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this configuration?",
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      /*
       * Preserve query parameters that may be required
       * by the API, for example company_id.
       */
      const [baseApi, queryString] = api.split("?");

      const deleteUrl = queryString
        ? `${baseApi}/${encodeURIComponent(String(id))}?${queryString}`
        : `${baseApi}/${encodeURIComponent(String(id))}`;

      const res = await fetch(deleteUrl, {
        method: "DELETE",
      });

      let data: ApiResponse = {};

      try {
        data = await res.json();
      } catch {
        // Empty response is allowed.
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "The configuration could not be deleted.",
        );
      }

      /*
       * If the last record on the current page
       * was deleted, move to the previous page.
       */
      if (rows.length === 1 && page > 1) {
        setPage((previous) => Math.max(1, previous - 1));

        return;
      }

      await loadData();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("The configuration could not be deleted.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     Start Edit
     ======================================================= */

  const startEdit = (row: Row) => {
    setErrorMessage(null);

    /*
     * Support common ID naming conventions.
     */
    const rowId = row.id ?? row.ID ?? row.uuid ?? null;

    if (rowId === null) {
      setErrorMessage(
        "This record does not contain a valid ID and cannot be edited.",
      );

      return;
    }

    const editableState: Row = {
      ...row,
    };

    fields.forEach((field) => {
      /* ===================================================
         Select Fields
         =================================================== */

      if (field.type === "select") {
        /*
         * Example:
         *
         * field.name = "vat_posting_setup_id"
         *
         * Try:
         *
         * vat_posting_setup_id
         * vat_posting_setup
         * posting_setup
         */

        const structuralKey = field.name.replace("_id", "");

        const alternateKey = field.name.replace("vat_", "").replace("_id", "");

        const recordDisplayValue =
          row[field.name] ?? row[structuralKey] ?? row[alternateKey];

        if (
          recordDisplayValue !== undefined &&
          recordDisplayValue !== null &&
          recordDisplayValue !== ""
        ) {
          /*
           * First try to match option value.
           */
          const explicitMatch = field.options?.find(
            (option) => option.value === String(recordDisplayValue),
          );

          if (explicitMatch) {
            editableState[field.name] = explicitMatch.value;

            return;
          }

          /*
           * Then try to match option label.
           */
          const labelMatch = field.options?.find(
            (option) =>
              option.label.toLowerCase() ===
              String(recordDisplayValue).toLowerCase(),
          );

          if (labelMatch) {
            editableState[field.name] = labelMatch.value;

            return;
          }
        }

        /*
         * If no matching option was found,
         * keep the original field value if available.
         */
        if (row[field.name] !== undefined) {
          editableState[field.name] = row[field.name];
        }

        return;
      }

      /* ===================================================
         Number Fields
         =================================================== */

      if (field.type === "number") {
        /*
         * Existing VAT APIs sometimes return:
         *
         * vat_value
         *
         * while the form expects:
         *
         * vat_rate
         */

        if (
          field.name === "vat_rate" &&
          row["vat_value"] !== undefined &&
          row["vat_rate"] === undefined
        ) {
          editableState["vat_rate"] = row["vat_value"];
        }

        return;
      }

      /* ===================================================
         Normal Fields
         =================================================== */

      if (
        editableState[field.name] === undefined ||
        editableState[field.name] === null
      ) {
        editableState[field.name] = "";
      }
    });

    setEditingId(rowId);
    setEditForm(editableState);
  };

  /* =======================================================
     Cancel Edit
     ======================================================= */

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setErrorMessage(null);
  };

  /* =======================================================
     Update Record
     ======================================================= */

  const updateRecord = async () => {
    if (editingId === null) {
      setErrorMessage("No record is currently selected for editing.");

      return;
    }

    if (!validateForm(editForm)) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      /*
       * Preserve query parameters from the original API.
       */
      const [baseApi, queryString] = api.split("?");

      const updateUrl = queryString
        ? `${baseApi}/${encodeURIComponent(String(editingId))}?${queryString}`
        : `${baseApi}/${encodeURIComponent(String(editingId))}`;

      const payload = {
        ...defaultValues,
        ...editForm,
      };

      const res = await fetch(updateUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data: ApiResponse = {};

      try {
        data = await res.json();
      } catch {
        // Empty response is allowed.
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "The configuration could not be updated.",
        );
      }

      setEditingId(null);
      setEditForm({});

      /*
       * Return to first page after update.
       */
      setPage(1);

      /*
       * Refresh immediately if already on page 1.
       */
      if (page === 1) {
        await loadData();
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("The configuration could not be updated.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     Search
     ======================================================= */

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  /* =======================================================
     Sorting
     ======================================================= */

  const handleSort = (column: Column) => {
    if (column.sortable === false) {
      return;
    }

    setSort((previous) => {
      /*
       * Clicking the same column toggles direction.
       */
      if (previous?.field === column.name) {
        return {
          field: column.name,
          direction: previous.direction === "asc" ? "desc" : "asc",
        };
      }

      /*
       * New column starts ascending.
       */
      return {
        field: column.name,
        direction: "asc",
      };
    });

    setPage(1);
  };

  /* =======================================================
     Pagination
     ======================================================= */

  const goToPreviousPage = () => {
    setPage((previous) => Math.max(1, previous - 1));
  };

  const goToNextPage = () => {
    /*
     * The existing API response does not expose
     * total pages, so we use the returned row count.
     *
     * If fewer than `limit` records are returned,
     * we consider it the final page.
     */
    if (rows.length < limit) {
      return;
    }

    setPage((previous) => previous + 1);
  };

  /* =======================================================
     Visible Fields
     ======================================================= */

  const visibleFields = fields.filter((field) => field.type !== "hidden");

  /* =======================================================
     Render
     ======================================================= */

  return (
    <div
      className="
        overflow-hidden
        rounded-xl
        border
        border-slate-200
        bg-white
        dark:border-slate-800
        dark:bg-slate-900
      "
    >
      {/* =====================================================
          Header
          ===================================================== */}

      {/* <SetupDataGridHeader title={title} recordCount={rows.length} /> */}

      {/* =====================================================
          Error
          ===================================================== */}

      {errorMessage && (
        <SetupDataGridError
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

      {/* =====================================================
          Form
          ===================================================== */}

      <SetupDataGridForm
        title={title}
        fields={visibleFields}
        form={form}
        submitting={submitting}
        loading={loading}
        onChange={handleFormChange}
        onSubmit={createRecord}
        onReset={resetForm}
      />

      {/* =====================================================
          Table
          ===================================================== */}

      <SetupDataGridTable
        title={title}
        rows={rows}
        columns={columns}
        fields={fields}
        loading={loading}
        submitting={submitting}
        editingId={editingId}
        editForm={editForm}
        page={page}
        limit={limit}
        search={search}
        sort={sort}
        onSearchChange={handleSearchChange}
        onSort={handleSort}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onEditFormChange={handleEditFormChange}
        onUpdate={updateRecord}
        onDelete={deleteRecord}
        onPreviousPage={goToPreviousPage}
        onNextPage={goToNextPage}
      />
    </div>
  );
}

/* "use client";

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
        const recordDisplayValue =
          row[f.name] || row[structuralKey] || row[alternateKey];

        if (recordDisplayValue) {
          // Check if value already matches a functional option code id
          const explicitMatch = f.options?.find(
            (o) => o.value === String(recordDisplayValue),
          );
          if (explicitMatch) {
            editableState[f.name] = explicitMatch.value;
          } else {
            // Find option matching display text label
            const labelMatch = f.options?.find(
              (o) =>
                o.label.toLowerCase() ===
                String(recordDisplayValue).toLowerCase(),
            );
            if (labelMatch) {
              editableState[f.name] = labelMatch.value;
            }
          }
        }
      } else if (f.type === "number") {
        // Explicitly patch up naming variation between vat_rate and vat_value keys
        if (
          f.name === "vat_rate" &&
          row["vat_value"] !== undefined &&
          row["vat_rate"] === undefined
        ) {
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


      <input
        type="text"
        placeholder="Search table configurations..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={loading}
        className="border p-2 rounded w-full dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
      />


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
        // variant="add_line"
        variant="save"
        // className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-medium transition disabled:opacity-50"
      >
        {submitting ? "Processing..." : "Add Record"}
      </Button>


      {loading && rows.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          Synchronizing registry mappings...
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg dark:border-slate-700">
          <table className="w-full table-fixed text-xs text-left">
            <colgroup>
              {columns.map((c) => (
                <col key={c.name} style={{ width: "180px" }} />
              ))}
              <col style={{ width: "220px" }} />
            </colgroup>
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
                        <td
                          key={c.name}
                          className="p-3 overflow-hidden whitespace-nowrap text-ellipsis"
                        >
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
                                  (inputName === "vat_rate"
                                    ? editForm["vat_value"]
                                    : "") ??
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
                            variant="save"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={cancelEdit}
                            disabled={submitting}
                            variant="cancel"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => startEdit(r)}
                            disabled={submitting}
                            variant="edit"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => remove(r.id!)}
                            disabled={submitting}
                            variant="cancel"
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
} */
