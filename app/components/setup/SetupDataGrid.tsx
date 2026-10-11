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
