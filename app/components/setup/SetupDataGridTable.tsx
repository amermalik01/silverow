// app/components/setup/SetupDataGridTable.tsx

"use client";

import { Icon } from "@iconify/react";

import type { Column, Field, Row, SortState } from "./setupDataGrid.types";

interface SetupDataGridTableProps {
  title?: string;
  rows: Row[];
  columns: Column[];
  fields: Field[];
  sort: SortState;
  loading: boolean;
  submitting: boolean;
  editingId: string | number | null;
  editForm: Row;
  page: number;
  limit: number;
  search: string;
  onSearchChange: (value: string) => void;
  onSort: (column: Column) => void;
  onStartEdit: (row: Row) => void;
  onCancelEdit: () => void;
  onUpdate: () => void;
  onDelete: (id: string | number) => void;
  onEditFormChange: (name: string, value: string | number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export default function SetupDataGridTable({
  title,
  rows,
  columns,
  fields,
  sort,
  loading,
  submitting,
  editingId,
  editForm,
  page,
  limit,
  search,
  onSearchChange,
  onSort,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onEditFormChange,
  onPreviousPage,
  onNextPage,
}: SetupDataGridTableProps) {
  /*
   * =========================================================
   * Helpers
   * =========================================================
   */

  const getRowId = (row: Row): string | number | null => {
    return row.id ?? row.ID ?? row.uuid ?? null;
  };

  const getCellValue = (row: Row, column: Column) => {
    const value = row[column.name];

    if (value === undefined || value === null || value === "") {
      return "—";
    }

    return String(value);
  };

  const getEditValue = (value: string | number | undefined) => {
    if (value === undefined || value === null) {
      return "";
    }

    return String(value);
  };

  /*
   * =========================================================
   * Render Edit Field
   * =========================================================
   */

  const renderEditField = (field: Field) => {
    if (field.type === "hidden") {
      return null;
    }

    if (field.type === "select") {
      return (
        <select
          value={getEditValue(editForm[field.name])}
          disabled={submitting}
          onChange={(event) => {
            onEditFormChange(field.name, event.target.value);
          }}
          className="
            h-9
            w-full
            rounded-md
            border
            border-slate-200
            bg-white
            px-2.5
            text-xs
            text-slate-700
            outline-none
            transition
            focus:border-emerald-500
            focus:ring-2
            focus:ring-emerald-500/10
            disabled:cursor-not-allowed
            disabled:opacity-50
            dark:border-slate-700
            dark:bg-slate-900
            dark:text-slate-200
          "
        >
          <option value="">
            Select {field.label || field.name}
            ...
          </option>

          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type || "text"}
        value={getEditValue(editForm[field.name])}
        disabled={submitting}
        onChange={(event) => {
          const value =
            field.type === "number"
              ? event.target.value === ""
                ? ""
                : Number(event.target.value)
              : event.target.value;

          onEditFormChange(field.name, value);
        }}
        className="
          h-9
          w-full
          rounded-md
          border
          border-slate-200
          bg-white
          px-2.5
          text-xs
          text-slate-700
          outline-none
          transition
          focus:border-emerald-500
          focus:ring-2
          focus:ring-emerald-500/10
          disabled:cursor-not-allowed
          disabled:opacity-50
          dark:border-slate-700
          dark:bg-slate-900
          dark:text-slate-200
        "
      />
    );
  };

  /*
   * =========================================================
   * Loading State
   * =========================================================
   */

  if (loading && rows.length === 0) {
    return (
      <div
        className="
          rounded-xl
          border
          border-dashed
          border-slate-200
          py-14
          text-center
          dark:border-slate-700
        "
      >
        <Icon
          icon="solar:refresh-linear"
          width={24}
          height={24}
          className="
            mx-auto
            animate-spin
            text-emerald-500
          "
        />

        <p
          className="
            mt-3
            text-xs
            font-medium
            text-slate-500
            dark:text-slate-400
          "
        >
          Loading configuration records...
        </p>
      </div>
    );
  }

  /*
   * =========================================================
   * Empty State
   * =========================================================
   */

  if (!loading && rows.length === 0) {
    return (
      <div>
        {/* Search while empty */}
        <div className="mb-4">
          <div className="relative">
            <Icon
              icon="solar:magnifer-linear"
              width={16}
              height={16}
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={
                title ? `Search ${title.toLowerCase()}...` : "Search..."
              }
              className="
                h-10
                w-full
                rounded-lg
                border
                border-slate-200
                bg-white
                pl-9
                pr-3
                text-xs
                text-slate-700
                outline-none
                transition
                placeholder:text-slate-400
                focus:border-emerald-500
                focus:ring-2
                focus:ring-emerald-500/10
                dark:border-slate-700
                dark:bg-slate-900
                dark:text-slate-200
                dark:placeholder:text-slate-500
              "
            />
          </div>
        </div>

        <div
          className="
            rounded-xl
            border
            border-dashed
            border-slate-200
            py-12
            text-center
            dark:border-slate-700
          "
        >
          <Icon
            icon="solar:database-linear"
            width={28}
            height={28}
            className="
              mx-auto
              text-slate-300
              dark:text-slate-600
            "
          />

          <p
            className="
              mt-3
              text-xs
              font-medium
              text-slate-500
              dark:text-slate-400
            "
          >
            {search ? "No records found." : "No records available."}
          </p>

          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="
                mt-2
                text-[10px]
                font-medium
                text-emerald-600
                hover:text-emerald-700
                dark:text-emerald-400
              "
            >
              Clear search
            </button>
          )}
        </div>

        {/* Pagination */}
        <div
          className="
            mt-4
            flex
            items-center
            justify-between
            rounded-xl
            border
            border-slate-200
            bg-white
            px-3
            py-2
            dark:border-slate-700
            dark:bg-slate-900
          "
        >
          <span
            className="
              text-[10px]
              text-slate-500
              dark:text-slate-400
            "
          >
            Page {page}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPreviousPage}
              disabled={page <= 1 || loading || submitting}
              className="
                inline-flex
                h-8
                items-center
                gap-1
                rounded-md
                border
                border-slate-200
                bg-white
                px-2.5
                text-[10px]
                font-medium
                text-slate-600
                transition
                hover:bg-slate-100
                disabled:cursor-not-allowed
                disabled:opacity-40
                dark:border-slate-700
                dark:bg-slate-900
                dark:text-slate-300
                dark:hover:bg-slate-800
              "
            >
              <Icon icon="solar:alt-arrow-left-linear" width={13} height={13} />
              Previous
            </button>

            <button
              type="button"
              onClick={onNextPage}
              disabled={rows.length < limit || loading || submitting}
              className="
                inline-flex
                h-8
                items-center
                gap-1
                rounded-md
                bg-emerald-600
                px-2.5
                text-[10px]
                font-medium
                text-white
                transition
                hover:bg-emerald-700
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              Next
              <Icon
                icon="solar:alt-arrow-right-linear"
                width={13}
                height={13}
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * Main Table
   * =========================================================
   */

  return (
    <div className="relative">
      {/* =====================================================
          Loading Indicator
          ===================================================== */}

      {loading && rows.length > 0 && (
        <div
          className="
              absolute
              right-3
              top-3
              z-10
              flex
              items-center
              gap-1.5
              rounded-md
              bg-white/90
              px-2
              py-1
              text-[10px]
              text-slate-500
              shadow
              dark:bg-slate-900/90
            "
        >
          <Icon
            icon="solar:refresh-linear"
            width={13}
            height={13}
            className="
                animate-spin
                text-emerald-500
              "
          />
          Updating...
        </div>
      )}

      {/* =====================================================
          Search
          ===================================================== */}

      <div className="mb-3 mx-2">
        <div className="relative">
          <Icon
            icon="solar:magnifer-linear"
            width={16}
            height={16}
            className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-slate-400
            "
          />

          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            disabled={loading}
            placeholder={
              title ? `Search ${title.toLowerCase()}...` : "Search..."
            }
            className="
              h-10
              w-full
              rounded-lg
              border
              border-slate-200
              bg-white
              pl-9
              pr-3
              text-xs
              text-slate-700
              outline-none
              transition
              placeholder:text-slate-400
              focus:border-emerald-500
              focus:ring-2
              focus:ring-emerald-500/10
              disabled:cursor-not-allowed
              disabled:opacity-50
              dark:border-slate-700
              dark:bg-slate-900
              dark:text-slate-200
              dark:placeholder:text-slate-500
            "
          />
        </div>
      </div>

      {/* =====================================================
          Table
          ===================================================== */}

      <div
        className="
          overflow-x-auto
          rounded-xl
          border
          border-slate-200
          dark:border-slate-700
          mx-2
        "
      >
        <table
          className="
            w-full
            min-w-[800px]
            table-fixed
            text-left
            text-xs
          "
        >
          <colgroup>
            {columns.map((column) => (
              <col
                key={column.name}
                style={{
                  width: "180px",
                }}
              />
            ))}

            <col
              style={{
                width: "220px",
              }}
            />
          </colgroup>

          {/* =================================================
              Table Header
              ================================================= */}

          <thead
            className="
              bg-slate-50
              dark:bg-slate-800/80
            "
          >
            <tr>
              {columns.map((column) => {
                const isSorted = sort?.field === column.name;

                return (
                  <th
                    key={column.name}
                    className="
                        select-none
                        p-3
                        text-left
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-wider
                        text-slate-500
                        dark:text-slate-400
                      "
                  >
                    <button
                      type="button"
                      disabled={column.sortable === false}
                      onClick={() => {
                        if (column.sortable === false) {
                          return;
                        }

                        onSort(column);
                      }}
                      className={`
                          inline-flex
                          items-center
                          gap-1
                          ${
                            column.sortable === false
                              ? "cursor-default"
                              : "cursor-pointer hover:text-emerald-600"
                          }
                        `}
                    >
                      {column.label}

                      {isSorted && (
                        <Icon
                          icon={
                            sort.direction === "asc"
                              ? "solar:alt-arrow-up-linear"
                              : "solar:alt-arrow-down-linear"
                          }
                          width={13}
                          height={13}
                        />
                      )}
                    </button>
                  </th>
                );
              })}

              <th
                className="
                  p-3
                  text-right
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-500
                  dark:text-slate-400
                "
              >
                Actions
              </th>
            </tr>
          </thead>

          {/* =================================================
              Table Body
              ================================================= */}

          <tbody
            className="
              divide-y
              divide-slate-100
              dark:divide-slate-800
            "
          >
            {rows.map((row, index) => {
              const rowId = getRowId(row);

              const isEditing =
                editingId !== null &&
                rowId !== null &&
                String(editingId) === String(rowId);

              return (
                <tr
                  key={rowId !== null ? String(rowId) : `row-${index}`}
                  className="
                      bg-white
                      transition
                      hover:bg-slate-50
                      dark:bg-slate-900
                      dark:hover:bg-slate-800/50
                    "
                >
                  {columns.map((column) => (
                    <td
                      key={column.name}
                      className="
                            p-3
                            align-middle
                            text-xs
                            text-slate-600
                            dark:text-slate-300
                          "
                    >
                      {isEditing &&
                      fields.some(
                        (field) =>
                          field.name === column.name && field.type !== "hidden",
                      ) ? (
                        (() => {
                          const field = fields.find(
                            (item) => item.name === column.name,
                          );

                          return field
                            ? renderEditField(field)
                            : getCellValue(row, column);
                        })()
                      ) : (
                        <span
                          className="
                                block
                                truncate
                              "
                        >
                          {getCellValue(row, column)}
                        </span>
                      )}
                    </td>
                  ))}

                  {/* =================================================
                        Actions
                        ================================================= */}

                  <td
                    className="
                        p-3
                        align-middle
                      "
                  >
                    {isEditing ? (
                      <div className="flex justify-end gap-1.5">
                        {/* Save */}

                        <button
                          type="button"
                          onClick={onUpdate}
                          disabled={submitting}
                          className="
                              inline-flex
                              h-8
                              items-center
                              gap-1
                              rounded-md
                              bg-emerald-600
                              px-2.5
                              text-[10px]
                              font-medium
                              text-white
                              transition
                              hover:bg-emerald-700
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                            "
                        >
                          <Icon
                            icon={
                              submitting
                                ? "solar:refresh-linear"
                                : "solar:check-circle-linear"
                            }
                            width={14}
                            height={14}
                            className={submitting ? "animate-spin" : ""}
                          />
                          Save
                        </button>

                        {/* Cancel */}

                        <button
                          type="button"
                          onClick={onCancelEdit}
                          disabled={submitting}
                          className="
                              inline-flex
                              h-8
                              items-center
                              gap-1
                              rounded-md
                              border
                              border-slate-200
                              bg-white
                              px-2.5
                              text-[10px]
                              font-medium
                              text-slate-600
                              transition
                              hover:bg-slate-100
                              disabled:opacity-50
                              dark:border-slate-700
                              dark:bg-slate-900
                              dark:text-slate-300
                              dark:hover:bg-slate-800
                            "
                        >
                          <Icon
                            icon="solar:close-circle-linear"
                            width={14}
                            height={14}
                          />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1.5">
                        {/* Edit */}

                        <button
                          type="button"
                          onClick={() => onStartEdit(row)}
                          className="
                              inline-flex
                              h-8
                              items-center
                              gap-1
                              rounded-md
                              border
                              border-slate-200
                              bg-white
                              px-2.5
                              text-[10px]
                              font-medium
                              text-slate-600
                              transition
                              hover:border-emerald-200
                              hover:bg-emerald-50
                              hover:text-emerald-700
                              dark:border-slate-700
                              dark:bg-slate-900
                              dark:text-slate-300
                              dark:hover:border-emerald-800
                              dark:hover:bg-emerald-950/30
                              dark:hover:text-emerald-400
                            "
                        >
                          <Icon
                            icon="solar:pen-linear"
                            width={14}
                            height={14}
                          />
                          Edit
                        </button>

                        {/* Delete */}

                        <button
                          type="button"
                          onClick={() => {
                            if (rowId !== null) {
                              onDelete(rowId);
                            }
                          }}
                          disabled={rowId === null}
                          className="
                              inline-flex
                              h-8
                              items-center
                              gap-1
                              rounded-md
                              border
                              border-red-200
                              bg-white
                              px-2.5
                              text-[10px]
                              font-medium
                              text-red-600
                              transition
                              hover:bg-red-50
                              disabled:cursor-not-allowed
                              disabled:opacity-40
                              dark:border-red-900/50
                              dark:bg-slate-900
                              dark:text-red-400
                              dark:hover:bg-red-950/30
                            "
                        >
                          <Icon
                            icon="solar:trash-bin-trash-linear"
                            width={14}
                            height={14}
                          />
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* =====================================================
          Pagination
          ===================================================== */}

      <div
        className="
          mt-3
          flex
          flex-col
          gap-2
          rounded-xl
          border
          border-slate-200
          bg-white
          px-3
          py-2.5
          sm:flex-row
          sm:items-center
          sm:justify-between
          dark:border-slate-700
          dark:bg-slate-900
          mx-2
        "
      >
        {/* Page information */}

        <div
          className="
            flex
            items-center
            gap-2
            text-[10px]
            text-slate-500
            dark:text-slate-400
          "
        >
          <span>
            Page{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {page}
            </span>
          </span>

          <span className="text-slate-300 dark:text-slate-700">•</span>

          <span>
            {rows.length} {rows.length === 1 ? "record" : "records"}
          </span>

          {search && (
            <>
              <span className="text-slate-300 dark:text-slate-700">•</span>

              <span className="truncate max-w-[180px]">
                Search:{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {search}
                </span>
              </span>
            </>
          )}
        </div>

        {/* Pagination controls */}

        <div className="flex items-center gap-1.5">
          {/* Previous */}

          <button
            type="button"
            onClick={onPreviousPage}
            disabled={page <= 1 || loading || submitting}
            className="
              inline-flex
              h-8
              items-center
              gap-1
              rounded-md
              border
              border-slate-200
              bg-white
              px-2.5
              text-[10px]
              font-medium
              text-slate-600
              transition
              hover:bg-slate-100
              disabled:cursor-not-allowed
              disabled:opacity-40
              dark:border-slate-700
              dark:bg-slate-900
              dark:text-slate-300
              dark:hover:bg-slate-800
            "
          >
            <Icon icon="solar:alt-arrow-left-linear" width={13} height={13} />
            Previous
          </button>

          {/* Current page */}

          <div
            className="
              flex
              h-8
              min-w-8
              items-center
              justify-center
              rounded-md
              bg-emerald-600
              px-2
              text-[10px]
              font-semibold
              text-white
            "
          >
            {page}
          </div>

          {/* Next */}

          <button
            type="button"
            onClick={onNextPage}
            disabled={rows.length < limit || loading || submitting}
            className="
              inline-flex
              h-8
              items-center
              gap-1
              rounded-md
              bg-emerald-600
              px-2.5
              text-[10px]
              font-medium
              text-white
              transition
              hover:bg-emerald-700
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            Next
            <Icon icon="solar:alt-arrow-right-linear" width={13} height={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* "use client";

import { Icon } from "@iconify/react";

import type { Column, Field, Row, SortState } from "./setupDataGrid.types";

interface SetupDataGridTableProps {
  title?: string;
  rows: Row[];
  columns: Column[];
  fields: Field[];
  sort: SortState;
  loading: boolean;
  submitting: boolean;
  editingId: string | number | null;
  editForm: Row;
  onSort: (column: Column) => void;
  onStartEdit: (row: Row) => void;
  onCancelEdit: () => void;
  onUpdate: () => void;
  onDelete: (id: string | number) => void;
  onEditFormChange: (name: string, value: string | number) => void;
}

export default function SetupDataGridTable({
  title,
  rows,
  columns,
  fields,
  sort,
  loading,
  submitting,
  editingId,
  editForm,
  onSort,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onEditFormChange,
}: SetupDataGridTableProps) {
  const getRowId = (row: Row): string | number | null => {
    return row.id ?? row.ID ?? row.uuid ?? null;
  };

  const getCellValue = (row: Row, column: Column) => {
    const value = row[column.name];

    if (value === undefined || value === null || value === "") {
      return "—";
    }

    return String(value);
  };

  const getEditValue = (value: string | number | undefined) => {
    if (value === undefined || value === null) {
      return "";
    }

    return String(value);
  };

  const renderEditField = (field: Field) => {
    if (field.type === "hidden") {
      return null;
    }

    if (field.type === "select") {
      return (
        <select
          value={getEditValue(editForm[field.name])}
          disabled={submitting}
          onChange={(event) => {
            onEditFormChange(field.name, event.target.value);
          }}
          className="
            h-9
            w-full
            rounded-md
            border
            border-slate-200
            bg-white
            px-2.5
            text-xs
            text-slate-700
            outline-none
            transition
            focus:border-emerald-500
            focus:ring-2
            focus:ring-emerald-500/10
            disabled:cursor-not-allowed
            disabled:opacity-50
            dark:border-slate-700
            dark:bg-slate-900
            dark:text-slate-200
          "
        >
          <option value="">Select {field.label || field.name}...</option>

          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type || "text"}
        value={getEditValue(editForm[field.name])}
        disabled={submitting}
        onChange={(event) => {
          const value =
            field.type === "number"
              ? event.target.value === ""
                ? ""
                : Number(event.target.value)
              : event.target.value;

          onEditFormChange(field.name, value);
        }}
        className="
          h-9
          w-full
          rounded-md
          border
          border-slate-200
          bg-white
          px-2.5
          text-xs
          text-slate-700
          outline-none
          transition
          focus:border-emerald-500
          focus:ring-2
          focus:ring-emerald-500/10
          disabled:cursor-not-allowed
          disabled:opacity-50
          dark:border-slate-700
          dark:bg-slate-900
          dark:text-slate-200
        "
      />
    );
  };

  if (loading && rows.length === 0) {
    return (
      <div
        className="
          rounded-xl
          border
          border-dashed
          border-slate-200
          py-14
          text-center
          dark:border-slate-700
        "
      >
        <Icon
          icon="solar:refresh-linear"
          width={24}
          height={24}
          className="
            mx-auto
            animate-spin
            text-emerald-500
          "
        />

        <p
          className="
            mt-3
            text-xs
            font-medium
            text-slate-500
            dark:text-slate-400
          "
        >
          Loading configuration records...
        </p>
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div
        className="
          rounded-xl
          border
          border-dashed
          border-slate-200
          py-12
          text-center
          dark:border-slate-700
        "
      >
        <Icon
          icon="solar:database-linear"
          width={28}
          height={28}
          className="mx-auto text-slate-300 dark:text-slate-600"
        />

        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          No records found.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && rows.length > 0 && (
        <div
          className="
            absolute
            right-3
            top-3
            z-10
            flex
            items-center
            gap-1.5
            rounded-md
            bg-white/90
            px-2
            py-1
            text-[10px]
            text-slate-500
            shadow
            dark:bg-slate-900/90
          "
        >
          <Icon
            icon="solar:refresh-linear"
            width={13}
            height={13}
            className="animate-spin text-emerald-500"
          />
          Updating...
        </div>
      )}

      <div
        className="
          overflow-x-auto
          rounded-xl
          border
          border-slate-200
          dark:border-slate-700
        "
      >
        <table
          className="
            w-full
            min-w-[800px]
            table-fixed
            text-left
            text-xs
          "
        >
          <colgroup>
            {columns.map((column) => (
              <col
                key={column.name}
                style={{
                  width: "180px",
                }}
              />
            ))}

            <col style={{ width: "220px" }} />
          </colgroup>

          <thead className="bg-slate-50 dark:bg-slate-800/80">
            <tr>
              {columns.map((column) => {
                const isSorted = sort?.field === column.name;

                return (
                  <th
                    key={column.name}
                    className="
                      select-none
                      p-3
                      text-left
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    <button
                      type="button"
                      disabled={column.sortable === false}
                      onClick={() => {
                        if (column.sortable === false) {
                          return;
                        }

                        onSort(column);
                      }}
                      className={`
                        inline-flex
                        items-center
                        gap-1
                        ${
                          column.sortable === false
                            ? "cursor-default"
                            : "cursor-pointer hover:text-emerald-600"
                        }
                      `}
                    >
                      {column.label}

                      {isSorted && (
                        <Icon
                          icon={
                            sort.direction === "asc"
                              ? "solar:alt-arrow-up-linear"
                              : "solar:alt-arrow-down-linear"
                          }
                          width={13}
                          height={13}
                        />
                      )}
                    </button>
                  </th>
                );
              })}

              <th
                className="
                  p-3
                  text-right
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-500
                  dark:text-slate-400
                "
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, index) => {
              const rowId = getRowId(row);

              const isEditing =
                editingId !== null &&
                rowId !== null &&
                String(editingId) === String(rowId);

              return (
                <tr
                  key={rowId !== null ? String(rowId) : `row-${index}`}
                  className="
                    bg-white
                    transition
                    hover:bg-slate-50
                    dark:bg-slate-900
                    dark:hover:bg-slate-800/50
                  "
                >
                  {columns.map((column) => (
                    <td
                      key={column.name}
                      className="
                        p-3
                        align-middle
                        text-xs
                        text-slate-600
                        dark:text-slate-300
                      "
                    >
                      {isEditing &&
                      fields.some(
                        (field) =>
                          field.name === column.name && field.type !== "hidden",
                      ) ? (
                        (() => {
                          const field = fields.find(
                            (item) => item.name === column.name,
                          );

                          return field
                            ? renderEditField(field)
                            : getCellValue(row, column);
                        })()
                      ) : (
                        <span className="block truncate">
                          {getCellValue(row, column)}
                        </span>
                      )}
                    </td>
                  ))}

                  <td className="p-3 align-middle">
                    {isEditing ? (
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={onUpdate}
                          disabled={submitting}
                          className="
                            inline-flex
                            h-8
                            items-center
                            gap-1
                            rounded-md
                            bg-emerald-600
                            px-2.5
                            text-[10px]
                            font-medium
                            text-white
                            transition
                            hover:bg-emerald-700
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          <Icon
                            icon={
                              submitting
                                ? "solar:refresh-linear"
                                : "solar:check-circle-linear"
                            }
                            width={14}
                            height={14}
                            className={submitting ? "animate-spin" : ""}
                          />
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={onCancelEdit}
                          disabled={submitting}
                          className="
                            inline-flex
                            h-8
                            items-center
                            gap-1
                            rounded-md
                            border
                            border-slate-200
                            bg-white
                            px-2.5
                            text-[10px]
                            font-medium
                            text-slate-600
                            transition
                            hover:bg-slate-100
                            disabled:opacity-50
                            dark:border-slate-700
                            dark:bg-slate-900
                            dark:text-slate-300
                            dark:hover:bg-slate-800
                          "
                        >
                          <Icon
                            icon="solar:close-circle-linear"
                            width={14}
                            height={14}
                          />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onStartEdit(row);
                          }}
                          className="
                            inline-flex
                            h-8
                            items-center
                            gap-1
                            rounded-md
                            border
                            border-slate-200
                            bg-white
                            px-2.5
                            text-[10px]
                            font-medium
                            text-slate-600
                            transition
                            hover:border-emerald-200
                            hover:bg-emerald-50
                            hover:text-emerald-700
                            dark:border-slate-700
                            dark:bg-slate-900
                            dark:text-slate-300
                            dark:hover:border-emerald-800
                            dark:hover:bg-emerald-950/30
                            dark:hover:text-emerald-400
                          "
                        >
                          <Icon
                            icon="solar:pen-linear"
                            width={14}
                            height={14}
                          />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (rowId !== null) {
                              onDelete(rowId);
                            }
                          }}
                          disabled={rowId === null}
                          className="
                            inline-flex
                            h-8
                            items-center
                            gap-1
                            rounded-md
                            border
                            border-red-200
                            bg-white
                            px-2.5
                            text-[10px]
                            font-medium
                            text-red-600
                            transition
                            hover:bg-red-50
                            disabled:cursor-not-allowed
                            disabled:opacity-40
                            dark:border-red-900/50
                            dark:bg-slate-900
                            dark:text-red-400
                            dark:hover:bg-red-950/30
                          "
                        >
                          <Icon
                            icon="solar:trash-bin-trash-linear"
                            width={14}
                            height={14}
                          />
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} */
