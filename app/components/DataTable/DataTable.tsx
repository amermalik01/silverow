// app/components/DataTable/DataTable.tsx

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  useRef,
} from "react";

import {
  ColumnConfig,
  DataTableProps,
  FetchParams,
  FilterValue,
} from "@/types/table";

import { ColumnHeaderFilter } from "./ColumnHeaderFilter";
import { CustomisationModal } from "./CustomisationModal";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getRowId<T extends object>(
  row: T,
  index: number,
  rowKey: keyof T | string = "id",
): string | number {
  const value = (row as Record<string, unknown>)[String(rowKey)];

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  /**
   * Fallback only.
   *
   * API data should ideally always contain a stable ID.
   */
  return index;
}

/* -------------------------------------------------------------------------- */
/* Data Table Cell                                                            */
/* -------------------------------------------------------------------------- */

const DataTableCell = memo(function DataTableCell<T extends object>({
  row,
  col,
  renderRowCell,
}: {
  row: T;
  col: ColumnConfig;
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;
}) {
  const customRender = renderRowCell
    ? renderRowCell(row, col.columnKey)
    : undefined;

  let cellValue: React.ReactNode = "-";

  if (customRender !== undefined) {
    cellValue = customRender;
  } else {
    const val = (row as Record<string, unknown>)[col.columnKey];

    if (val !== null && val !== undefined) {
      cellValue =
        typeof val === "object" ? String(val) : (val as React.ReactNode);
    }
  }

  return (
    <td
      style={{
        backgroundColor: col.headerColor ? `${col.headerColor}15` : undefined,
      }}
      className={`border-r border-slate-200 dark:border-slate-800 p-2 ${
        col.isPinned
          ? "sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-sm"
          : ""
      }`}
    >
      {cellValue}
    </td>
  );
}) as <T extends object>(props: {
  row: T;
  col: ColumnConfig;
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;
}) => React.JSX.Element;

/* -------------------------------------------------------------------------- */
/* Data Table Row                                                             */
/* -------------------------------------------------------------------------- */

const DataTableRow = memo(function DataTableRow<T extends object>({
  row,
  rowId,
  visibleColumns,
  renderRowCell,
  enableRowSelection,
  isSelected,
  onToggleSelection,
}: {
  row: T;
  rowId: string | number;
  visibleColumns: ColumnConfig[];
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;

  enableRowSelection: boolean;

  isSelected: boolean;

  onToggleSelection: (rowId: string | number) => void;
}) {
  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
      {/* Selection Checkbox */}
      {enableRowSelection && (
        <td className="w-10 border-r border-slate-200 dark:border-slate-800 p-2 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(rowId)}
            aria-label={`Select row ${rowId}`}
            className="h-4 w-4 accent-emerald-600 cursor-pointer rounded"
          />
        </td>
      )}

      {/* Data Cells */}
      {visibleColumns.map((col) => (
        <DataTableCell
          key={col.columnKey}
          row={row}
          col={col}
          renderRowCell={
            renderRowCell as (row: object, columnKey: string) => React.ReactNode
          }
        />
      ))}
    </tr>
  );
}) as <T extends object>(props: {
  row: T;
  rowId: string | number;
  visibleColumns: ColumnConfig[];
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;

  enableRowSelection: boolean;

  isSelected: boolean;

  onToggleSelection: (rowId: string | number) => void;
}) => React.JSX.Element;

/* -------------------------------------------------------------------------- */
/* Main DataTable                                                             */
/* -------------------------------------------------------------------------- */

export function DataTable<T extends object>({
  moduleKey,
  fetchApi,
  columnsConfigApi,
  renderRowCell,
  enableRowSelection = false,
  onSelectionChange,
  rowKey = "id",
}: DataTableProps<T>) {
  /* ------------------------------------------------------------------------ */
  /* State                                                                    */
  /* ------------------------------------------------------------------------ */

  const [data, setData] = useState<T[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);

  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [filters, setFilters] = useState<FilterValue>({});

  const [debouncedFilters, setDebouncedFilters] = useState<FilterValue>({});

  const [showFilters, setShowFilters] = useState(false);

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);

  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(
    undefined,
  );

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [globalSearch, setGlobalSearch] = useState("");

  /**
   * Selected row IDs.
   */
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    () => new Set(),
  );

  /**
   * Used to prevent stale requests from updating state.
   */
  const requestIdRef = useRef(0);

  /**
   * Prevents the first filter debounce from unnecessarily
   * triggering a second state update.
   */
  const isInitialFilterRender = useRef(true);

  /* ------------------------------------------------------------------------ */
  /* Derived state                                                            */
  /* ------------------------------------------------------------------------ */

  const visibleColumns = useMemo(
    () =>
      columns
        .filter((col) => col.isVisible)
        .sort((a, b) => a.columnOrder - b.columnOrder),
    [columns],
  );

  /**
   * IMPORTANT:
   *
   * The checkbox column is only shown after the listing
   * request has completed AND actual data exists.
   *
   * This fixes the visual issue where checkboxes appear
   * before the listing data.
   */
  const showSelectionColumn = enableRowSelection && !loading && data.length > 0;

  /**
   * Search is deliberately kept client-side for the
   * current page only.
   *
   * If your API supports global search, we can move this
   * completely server-side later.
   */
  const filteredData = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();

    if (!term) {
      return data;
    }

    return data.filter((row) => {
      const rowRecord = row as Record<string, unknown>;

      return visibleColumns.some((col) => {
        const rawValue = rowRecord[col.columnKey];

        if (rawValue === null || rawValue === undefined) {
          return false;
        }

        return String(rawValue).toLowerCase().includes(term);
      });
    });
  }, [data, globalSearch, visibleColumns]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(
      (filter) =>
        filter &&
        Boolean(
          (filter.value !== undefined && filter.value !== "") ||
          (filter.from !== undefined && filter.from !== "") ||
          (filter.to !== undefined && filter.to !== ""),
        ),
    ).length;
  }, [filters]);

  const startRecord = totalRecords > 0 ? (page - 1) * pageSize + 1 : 0;

  const endRecord =
    totalRecords > 0 ? Math.min(page * pageSize, totalRecords) : 0;

  /**
   * IDs currently visible on this page.
   */
  const visibleRowIds = useMemo(() => {
    return filteredData.map((row, index) => getRowId(row, index, rowKey));
  }, [filteredData, rowKey]);

  const isAllSelected =
    showSelectionColumn &&
    visibleRowIds.length > 0 &&
    visibleRowIds.every((id) => selectedIds.has(id));

  /* ------------------------------------------------------------------------ */
  /* Filter debounce                                                          */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (isInitialFilterRender.current) {
      isInitialFilterRender.current = false;
      return;
    }

    const handler = window.setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);

    return () => {
      window.clearTimeout(handler);
    };
  }, [filters]);

  /* ------------------------------------------------------------------------ */
  /* Load Columns                                                             */
  /* ------------------------------------------------------------------------ */

  const loadColumns = useCallback(async () => {
    try {
      const config = await columnsConfigApi.get(moduleKey);

      const sortedConfig = [...config].sort(
        (a, b) => a.columnOrder - b.columnOrder,
      );

      setColumns(sortedConfig);
    } catch (err) {
      console.error("Failed to load column configuration:", err);
    }
  }, [moduleKey, columnsConfigApi]);

  /* ------------------------------------------------------------------------ */
  /* Load Data                                                                */
  /* ------------------------------------------------------------------------ */

  const loadData = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;

    setLoading(true);

    try {
      const params: FetchParams = {
        page,
        pageSize,
        filters: debouncedFilters,
        search: globalSearch.trim(),
        sortBy,
        sortOrder,
      };

      const response = await fetchApi(params);

      /**
       * Ignore old request responses.
       *
       * Example:
       *
       * Request A = page 1
       * Request B = page 2
       *
       * If B finishes first, A should not overwrite B.
       */
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setData(response.data || []);
      setTotalRecords(response.totalRecords || 0);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      console.error("Failed to fetch table data:", err);

      setData([]);
      setTotalRecords(0);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    page,
    pageSize,
    debouncedFilters,
    globalSearch,
    sortBy,
    sortOrder,
    fetchApi,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Effects                                                                  */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    loadColumns();
  }, [loadColumns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Clear selected rows whenever the actual listing
   * changes.
   *
   * This prevents selections from one page being
   * accidentally applied to another page.
   */
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pageSize, debouncedFilters, sortBy, sortOrder, data]);

  /**
   * Inform parent component about selected IDs.
   */
  useEffect(() => {
    if (!onSelectionChange) {
      return;
    }

    onSelectionChange(Array.from(selectedIds));
  }, [selectedIds, onSelectionChange]);

  /* ------------------------------------------------------------------------ */
  /* Filter handlers                                                          */
  /* ------------------------------------------------------------------------ */

  const handleFilterChange = useCallback(
    (columnKey: string, filterData: FilterValue[string]) => {
      setFilters((previous) => ({
        ...previous,
        [columnKey]: filterData,
      }));

      setPage(1);
    },
    [],
  );

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setDebouncedFilters({});
    setPage(1);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Sorting                                                                  */
  /* ------------------------------------------------------------------------ */

  const handleSortChange = useCallback((columnKey: string) => {
    if (columnKey === "actions") {
      return;
    }

    setSortBy((previousSortBy) => {
      /**
       * First click:
       * column ASC
       */
      if (previousSortBy !== columnKey) {
        setSortOrder("asc");
        return columnKey;
      }

      /**
       * Second click:
       * column DESC
       */
      setSortOrder((previousOrder) => {
        if (previousOrder === "asc") {
          return "desc";
        }

        /**
         * Third click:
         * remove sorting
         */
        setSortBy(undefined);
        return undefined;
      });

      return columnKey;
    });

    setPage(1);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Row Selection                                                            */
  /* ------------------------------------------------------------------------ */

  const handleToggleSelection = useCallback((rowId: string | number) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }

      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((previous) => {
      const next = new Set(previous);

      const allSelected =
        visibleRowIds.length > 0 && visibleRowIds.every((id) => next.has(id));

      if (allSelected) {
        visibleRowIds.forEach((id) => next.delete(id));
      } else {
        visibleRowIds.forEach((id) => next.add(id));
      }

      return next;
    });
  }, [visibleRowIds]);

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="w-full font-sans text-slate-800 dark:text-slate-100 rounded-xl overflow-hidden shadow-lg border border-emerald-900/30">
      {/* ------------------------------------------------------------------ */}
      {/* Toolbar                                                            */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-col sm:flex-row items-center justify-between bg-emerald-950 px-3 py-2 text-emerald-100 border-b border-emerald-900 gap-2">
        <div className="flex items-center gap-1.5 w-full">
          {/* Search */}
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search current page data..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full rounded-lg bg-emerald-900/60 border border-emerald-700/50 px-3 py-1.5 pl-8 text-xs text-emerald-100 placeholder-emerald-400/70 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />

            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-emerald-400">
              🔍
            </span>

            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-emerald-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Customize */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/50 transition-colors shrink-0"
          >
            ⚙️ Customise Table
          </button>

          {/* Filters */}
          <button
            type="button"
            onClick={() => setShowFilters((previous) => !previous)}
            className={`relative p-1.5 rounded-lg transition-colors border shrink-0 ${
              showFilters
                ? "bg-emerald-700 text-white border-emerald-500"
                : "bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/50"
            }`}
          >
            🔻 Column Filters
          </button>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-[11px] font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-200 px-2.5 py-1 rounded-lg border border-rose-800/80 transition-colors shrink-0"
            >
              ✕ Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Selection count */}
        <div className="text-xs text-emerald-300 font-medium self-end sm:self-auto whitespace-nowrap">
          {enableRowSelection && selectedIds.size > 0 && (
            <>{selectedIds.size} selected</>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Table                                                              */}
      {/* ------------------------------------------------------------------ */}

      <div className="relative overflow-x-auto bg-white dark:bg-slate-900">
        <table className="w-full border-collapse table-fixed text-left text-xs">
          <thead>
            {/* Header */}
            <tr className="bg-emerald-900 font-semibold text-emerald-50">
              {/* Selection Header */}
              {showSelectionColumn && (
                <th className="w-10 border-r border-emerald-800 p-2 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 accent-emerald-500 cursor-pointer"
                  />
                </th>
              )}

              {/* Column Headers */}
              {visibleColumns.map((col) => (
                <th
                  key={col.columnKey}
                  onClick={() => handleSortChange(col.columnKey)}
                  style={{
                    width: col.columnWidth ? `${col.columnWidth}px` : "auto",

                    backgroundColor: col.headerColor || undefined,
                  }}
                  className={`border-r border-emerald-800/80 p-2 font-bold capitalize tracking-wider text-[11px] select-none ${
                    col.columnKey !== "actions"
                      ? "cursor-pointer hover:bg-emerald-800/60"
                      : ""
                  } ${col.isPinned ? "sticky left-0 z-20 shadow-md" : ""}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>{col.label}</span>

                    {col.columnKey !== "actions" && (
                      <span className="text-[10px] text-emerald-300 opacity-80">
                        {sortBy === col.columnKey
                          ? sortOrder === "asc"
                            ? "▲"
                            : "▼"
                          : "⇅"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>

            {/* Filter Row */}
            {showFilters && (
              <tr className="bg-emerald-900/90 border-b border-emerald-800">
                {showSelectionColumn && (
                  <td className="w-10 border-r border-emerald-800/80 p-2 text-center bg-emerald-900" />
                )}

                {visibleColumns.map((col) => (
                  <td
                    key={`filter-${col.columnKey}`}
                    style={{
                      backgroundColor: col.headerColor || undefined,
                    }}
                    className="border-r border-emerald-800/80 p-2 items-start content-start"
                  >
                    <ColumnHeaderFilter
                      column={col}
                      filters={filters}
                      onFilterChange={handleFilterChange}
                    />
                  </td>
                ))}
              </tr>
            )}
          </thead>

          {/* ---------------------------------------------------------------- */}
          {/* Body                                                            */}
          {/* ---------------------------------------------------------------- */}

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {/* Loading */}
            {loading ? (
              /**
               * IMPORTANT:
               *
               * Skeleton rows deliberately DO NOT render
               * selection checkboxes.
               *
               * The checkbox column only appears after
               * actual data has arrived.
               */
              Array.from({
                length: pageSize,
              }).map((_, rowIndex) => (
                <tr key={`skeleton-row-${rowIndex}`} className="animate-pulse">
                  {visibleColumns.map((col) => (
                    <td
                      key={`skeleton-cell-${col.columnKey}`}
                      className="border-r border-slate-200 dark:border-slate-800 p-2"
                    >
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredData.length === 0 ? (
              /* Empty */
              <tr>
                <td
                  colSpan={
                    visibleColumns.length + (showSelectionColumn ? 1 : 0)
                  }
                  className="p-12 text-center text-slate-400 font-medium"
                >
                  No data matching criteria.
                </td>
              </tr>
            ) : (
              /* Actual Rows */
              filteredData.map((row, index) => {
                const rowId = getRowId(row, index, rowKey);

                return (
                  <DataTableRow
                    key={rowId}
                    row={row}
                    rowId={rowId}
                    visibleColumns={visibleColumns}
                    renderRowCell={renderRowCell}
                    enableRowSelection={showSelectionColumn}
                    isSelected={selectedIds.has(rowId)}
                    onToggleSelection={handleToggleSelection}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pagination                                                         */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-col sm:flex-row items-center justify-between border-t bg-slate-50 dark:bg-slate-800/60 p-2 text-xs text-slate-600 dark:text-slate-300 gap-3">
        <div className="font-semibold">{totalRecords} Total Records</div>

        <div className="flex items-center gap-4">
          <div>
            Showing <span className="font-bold">{startRecord}</span> to{" "}
            <span className="font-bold">{endRecord}</span>
          </div>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 outline-none cursor-pointer"
          >
            <option value={20}>20</option>

            <option value={50}>50</option>

            <option value={100}>100</option>
          </select>

          <span>per page</span>

          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={loading || page === 1}
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 disabled:opacity-40 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={
                loading || endRecord >= totalRecords || totalRecords === 0
              }
              onClick={() => setPage((previous) => previous + 1)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 disabled:opacity-40 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Customisation Modal                                                */}
      {/* ------------------------------------------------------------------ */}

      <CustomisationModal
        key={`${isModalOpen}-${columns.length}`}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        columns={columns}
        onSave={async (updatedCols) => {
          await columnsConfigApi.save(moduleKey, updatedCols);

          setColumns(
            [...updatedCols].sort((a, b) => a.columnOrder - b.columnOrder),
          );

          setIsModalOpen(false);
        }}
        onResetDefault={async () => {
          const defaultConfig = await columnsConfigApi.reset(moduleKey);

          setColumns(
            [...defaultConfig].sort((a, b) => a.columnOrder - b.columnOrder),
          );

          setIsModalOpen(false);
        }}
      />
    </div>
  );
}

/* interface DataTableProps<T> {
  moduleKey: string;
  fetchApi: (params: FetchParams) => Promise<FetchResponse<T>>;
  columnsConfigApi: {
    get: (moduleKey: string) => Promise<ColumnConfig[]>;
    save: (moduleKey: string, configs: ColumnConfig[]) => Promise<void>;
    reset: (moduleKey: string) => Promise<ColumnConfig[]>;
  };
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;
}

const DataTableCell = memo(function DataTableCell<T extends object>({
  row,
  col,
  renderRowCell,
}: {
  row: T;
  col: ColumnConfig;
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;
}) {
  const customRender = renderRowCell
    ? renderRowCell(row, col.columnKey)
    : undefined;

  let cellValue: React.ReactNode = "-";
  if (customRender !== undefined) {
    cellValue = customRender;
  } else {
    const val = (row as Record<string, unknown>)[col.columnKey];
    if (val !== null && val !== undefined) {
      cellValue =
        typeof val === "object" ? String(val) : (val as React.ReactNode);
    }
  }

  return (
    <td
      style={{
        backgroundColor: col.headerColor ? `${col.headerColor}15` : undefined,
      }}
      className={`border-r border-slate-200 dark:border-slate-800 p-2 ${
        col.isPinned
          ? "sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-sm"
          : ""
      }`}
    >
      {cellValue}
    </td>
  );
}) as <T extends object>(props: {
  row: T;
  col: ColumnConfig;
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;
}) => React.JSX.Element;

const DataTableRow = memo(function DataTableRow<T extends object>({
  row,
  rowId,
  visibleColumns,
  renderRowCell,
}: {
  row: T;
  rowId: string | number;
  visibleColumns: ColumnConfig[];
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;
}) {
  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
      <td className="border-r border-slate-200 dark:border-slate-800 p-2 text-center">
        <input
          type="checkbox"
          className="accent-emerald-600 cursor-pointer rounded"
        />
      </td>
      {visibleColumns.map((col) => (
        <DataTableCell
          key={col.columnKey}
          row={row}
          col={col}
          renderRowCell={
            renderRowCell as (row: object, columnKey: string) => React.ReactNode
          }
        />
      ))}
    </tr>
  );
}) as <T extends object>(props: {
  row: T;
  rowId: string | number;
  visibleColumns: ColumnConfig[];
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;
}) => React.JSX.Element;

export function DataTable<T extends object>({
  moduleKey,
  fetchApi,
  columnsConfigApi,
  renderRowCell,
}: DataTableProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Pagination, Filter & Sorting State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [filters, setFilters] = useState<FilterValue>({});
  const [debouncedFilters, setDebouncedFilters] = useState<FilterValue>({});
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(
    undefined,
  );
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>("");

  const isInitialFilterRender = useRef(true);

  // Debounce filter changes without triggering initial mount duplicate state update
  useEffect(() => {
    if (isInitialFilterRender.current) {
      isInitialFilterRender.current = false;
      return;
    }
    const handler = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => clearTimeout(handler);
  }, [filters]);

  const loadColumns = useCallback(async () => {
    try {
      const config = await columnsConfigApi.get(moduleKey);
      setColumns(config.sort((a, b) => a.columnOrder - b.columnOrder));
    } catch (err) {
      console.error("Failed to load column configuration:", err);
    }
  }, [moduleKey, columnsConfigApi]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi({
        page,
        pageSize,
        filters: debouncedFilters,
        sortBy,
        sortOrder,
      });
      setData(res.data || []);
      setTotalRecords(res.totalRecords || 0);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedFilters, sortBy, sortOrder, fetchApi]);

  useEffect(() => {
    loadColumns();
  }, [loadColumns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = useCallback(
    (columnKey: string, filterData: FilterValue[string]) => {
      setFilters((prev) => ({
        ...prev,
        [columnKey]: filterData,
      }));
      setPage(1);
    },
    [],
  );

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setDebouncedFilters({});
    setPage(1);
  }, []);

  const handleSortChange = useCallback((columnKey: string) => {
    if (columnKey === "actions") return;
    setSortBy((prevSortBy) => {
      if (prevSortBy !== columnKey) {
        setSortOrder("asc");
        return columnKey;
      }
      setSortOrder((prevOrder) => {
        if (prevOrder === "asc") return "desc";
        setSortBy(undefined);
        return undefined;
      });
      return columnKey;
    });
    setPage(1);
  }, []);

  const visibleColumns = useMemo(
    () => columns.filter((col) => col.isVisible),
    [columns],
  );

  const filteredData = useMemo(() => {
    if (!globalSearch.trim()) return data;
    const term = globalSearch.toLowerCase().trim();
    return data.filter((row) => {
      return visibleColumns.some((col) => {
        const rawVal = (row as Record<string, unknown>)[col.columnKey];
        return (
          rawVal !== null &&
          rawVal !== undefined &&
          String(rawVal).toLowerCase().includes(term)
        );
      });
    });
  }, [data, globalSearch, visibleColumns]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(
      (f) => f && Boolean(f.value || f.from || f.to),
    ).length;
  }, [filters]);

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalRecords);

  return (
    <div className="w-full font-sans text-slate-800 dark:text-slate-100 rounded-xl overflow-hidden shadow-lg border border-emerald-900/30">
      <div className="flex flex-col sm:flex-row items-center justify-between bg-emerald-950 px-3 py-2 text-emerald-100 border-b border-emerald-900 gap-2">
        <div className="flex items-center gap-1.5 w-full">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search current page data..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full rounded-lg bg-emerald-900/60 border border-emerald-700/50 px-3 py-1.5 pl-8 text-xs text-emerald-100 placeholder-emerald-400/70 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-emerald-400">
              🔍
            </span>
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-emerald-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/50 transition-colors shrink-0"
          >
            ⚙️ Customise Table
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-1.5 rounded-lg transition-colors border shrink-0 ${
              showFilters
                ? "bg-emerald-700 text-white border-emerald-500"
                : "bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/50"
            }`}
          >
            🔻 Column Filters
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-[11px] font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-200 px-2.5 py-1 rounded-lg border border-rose-800/80 transition-colors shrink-0"
            >
              ✕ Clear ({activeFilterCount})
            </button>
          )}
        </div>

        <div className="text-xs text-emerald-300 font-medium self-end sm:self-auto">
        
        </div>
      </div>

      <div className="relative overflow-x-auto bg-white dark:bg-slate-900">
        <table className="w-full border-collapse table-fixed text-left text-xs">
  
          <thead>
            <tr className="bg-emerald-900 font-semibold text-emerald-50">

              {!loading && filteredData.length > 0 && (
                <th className="w-10 border-r border-emerald-800 p-2 text-center">
                  <input
                    type="checkbox"
                    // checked={isAllSelected}
                    // onChange={handleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-700 text-slate-900 focus:ring-slate-500"
                  />
                </th>
              )}
              {visibleColumns.map((col) => (
                <th
                  key={col.columnKey}
                  onClick={() => handleSortChange(col.columnKey)}
                  style={{
                    width: col.columnWidth ? `${col.columnWidth}px` : "auto",
                    backgroundColor: col.headerColor || undefined,
                  }}
                  className={`border-r border-emerald-800/80 p-2 font-bold capitalize tracking-wider text-[11px] select-none ${
                    col.columnKey !== "actions"
                      ? "cursor-pointer hover:bg-emerald-800/60"
                      : ""
                  } ${col.isPinned ? "sticky left-0 z-20 shadow-md" : ""}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>{col.label}</span>
                    {col.columnKey !== "actions" && (
                      <span className="text-[10px] text-emerald-300 opacity-80">
                        {sortBy === col.columnKey
                          ? sortOrder === "asc"
                            ? "▲"
                            : "▼"
                          : "⇅"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>

            {showFilters && (
              <tr className="bg-emerald-900/90 border-b border-emerald-800">
                <td className="border-r border-emerald-800/80 p-2 text-center bg-emerald-900"></td>
                {visibleColumns.map((col) => (
                  <td
                    key={`filter-${col.columnKey}`}
                    style={{ backgroundColor: col.headerColor || undefined }}
                    className="border-r border-emerald-800/80 p-2 items-start content-start"
                  >
                    <ColumnHeaderFilter
                      column={col}
                      filters={filters}
                      onFilterChange={handleFilterChange}
                    />
                  </td>
                ))}
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? (
              // Render skeleton rows equal to current pageSize to preserve table height and eliminate flickering
              Array.from({ length: pageSize }).map((_, rowIndex) => (
                <tr key={`skeleton-row-${rowIndex}`} className="animate-pulse">
                  {filteredData.length > 0 && (
                    <td className="border-r border-slate-200 dark:border-slate-800 p-2 text-center">
                      <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                    </td>
                  )}
                  {visibleColumns.map((col) => (
                    <td
                      key={`skeleton-cell-${col.columnKey}`}
                      className="border-r border-slate-200 dark:border-slate-800 p-2"
                    >
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="p-12 text-center text-slate-400 font-medium"
                >
                  No data matching criteria.
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => {
                const rowObj = row as Record<string, unknown>;
                const rowId =
                  "id" in rowObj &&
                  (typeof rowObj.id === "string" ||
                    typeof rowObj.id === "number")
                    ? rowObj.id
                    : idx;

                return (
                  <DataTableRow
                    key={rowId}
                    row={row}
                    rowId={rowId}
                    visibleColumns={visibleColumns}
                    renderRowCell={renderRowCell}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between border-t bg-slate-50 dark:bg-slate-800/60 p-2 text-xs text-slate-600 dark:text-slate-300 gap-3">
        <div className="font-semibold">{totalRecords} Total Records</div>
        <div className="flex items-center gap-4">
          <div>
            Showing{" "}
            <span className="font-bold">
              {totalRecords > 0 ? startRecord : 0}
            </span>{" "}
            to <span className="font-bold">{endRecord}</span>
          </div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 outline-none  cursor-pointer"
          >
            <option value={20}>20 &nbsp;&nbsp;</option>
            <option value={50}>50 &nbsp;&nbsp;</option>
            <option value={100}>100 &nbsp;&nbsp;</option>
          </select>
          per page
          <div className="flex gap-1.5">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 disabled:opacity-40 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={endRecord >= totalRecords}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 disabled:opacity-40 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <CustomisationModal
        key={`${isModalOpen}-${columns.length}`}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        columns={columns}
        onSave={async (updatedCols) => {
          await columnsConfigApi.save(moduleKey, updatedCols);
          setColumns(updatedCols);
          setIsModalOpen(false);
        }}
        onResetDefault={async () => {
          const defaultConfig = await columnsConfigApi.reset(moduleKey);
          setColumns(defaultConfig);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
} */
