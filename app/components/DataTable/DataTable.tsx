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
  ListingStatus,
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

  const [statusFilter, setStatusFilter] = useState<ListingStatus>("active");

  const [loadedQueryKey, setLoadedQueryKey] = useState<string | null>(null);

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

  const currentQueryKey = useMemo(
    () =>
      JSON.stringify({
        page,
        pageSize,
        filters: debouncedFilters,
        search: globalSearch.trim(),
        sortBy,
        sortOrder,
        statusFilter,
      }),
    [
      page,
      pageSize,
      debouncedFilters,
      globalSearch,
      sortBy,
      sortOrder,
      statusFilter,
    ],
  );

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
  // const showSelectionColumn = enableRowSelection && !loading && data.length > 0;
  const showSelectionColumn =
    enableRowSelection &&
    !loading &&
    loadedQueryKey === currentQueryKey &&
    data.length > 0;

  /**
   * Search is deliberately kept client-side for the
   * current page only.
   *
   * If your API supports global search, we can move this
   * completely server-side later.
   */

  const filteredData = data;
  // const filteredData = useMemo(() => {
  //   const term = globalSearch.trim().toLowerCase();

  //   if (!term) {
  //     return data;
  //   }

  //   return data.filter((row) => {
  //     const rowRecord = row as Record<string, unknown>;

  //     return visibleColumns.some((col) => {
  //       const rawValue = rowRecord[col.columnKey];

  //       if (rawValue === null || rawValue === undefined) {
  //         return false;
  //       }

  //       return String(rawValue).toLowerCase().includes(term);
  //     });
  //   });
  // }, [data, globalSearch, visibleColumns]);

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

      console.log("[DataTable] Columns:", {
        moduleKey,
        total: config.length,
        visible: config.filter((col) => col.isVisible).length,
        keys: config.map((col) => col.columnKey),
      });

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
    const requestQueryKey = currentQueryKey;

    setLoading(true);
    setLoadedQueryKey(null);

    try {
      const params: FetchParams = {
        page,
        pageSize,
        filters: debouncedFilters,
        search: globalSearch.trim(),
        sortBy,
        sortOrder,
        statusFilter,
      };

      const response = await fetchApi(params);

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setData(response.data || []);
      setTotalRecords(response.totalRecords || 0);
      setLoadedQueryKey(requestQueryKey);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      console.error("Failed to fetch table data:", err);

      setData([]);
      setTotalRecords(0);
      setLoadedQueryKey(null);
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
    statusFilter,
    fetchApi,
    currentQueryKey,
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

  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentQueryKey]);

  // useEffect(() => {
  //   setSelectedIds(new Set());
  // }, [page, pageSize, debouncedFilters, sortBy, sortOrder, statusFilter, data]);

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

  const handleStatusChange = useCallback(
    (nextStatus: ListingStatus) => {
      if (nextStatus === statusFilter) return;

      setLoading(true);
      setStatusFilter(nextStatus);
      setPage(1);
      setSelectedIds(new Set());
    },
    [statusFilter],
  );

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

      <div className="flex flex-col sm:flex-row xl:items-center xl:justify-between  bg-emerald-950 px-3 py-2 text-emerald-100 border-b border-emerald-900 gap-3">
        {/* gap-3 w-full */}
        {/* Left: Status and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 flex-1">
          {/* Search */}
          <div className="relative w-full sm:max-w-sm">
            <input
              type="text"
              placeholder="Search records..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full rounded-md border border-emerald-700/60
                bg-emerald-900/50 py-2 pl-9 pr-9 text-xs text-white
                placeholder:text-emerald-300/70 outline-none
                transition-colors focus:border-emerald-400
                focus:ring-2 focus:ring-emerald-500/20"
            />

            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300 pointer-events-none">
              🔍
            </span>

            {globalSearch && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setGlobalSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Table Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Active / Inactive */}
          <div
            className="inline-flex w-fit shrink-0 items-center gap-1 rounded-md border border-emerald-800/70 bg-slate-900/60 p-1"
            role="group"
            aria-label="Filter records by status"
          >
            <button
              type="button"
              aria-pressed={statusFilter === "active"}
              onClick={() => handleStatusChange("active")}
              className={`inline-flex items-center justify-center gap-2
                rounded-md px-3 py-1 text-xs font-semibold transition-all
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-emerald-400 ${
                  statusFilter === "active"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-emerald-200 hover:bg-emerald-800/70"
                }`}
            >
              {/* <span
                className={`h-2 w-2 rounded-full ${
                  statusFilter === "active"
                    ? "bg-emerald-200"
                    : "bg-emerald-400"
                }`}
              /> */}
              Active
            </button>

            <button
              type="button"
              aria-pressed={statusFilter === "inactive"}
              onClick={() => handleStatusChange("inactive")}
              className={`inline-flex items-center justify-center gap-2
                rounded-md px-3 py-1 text-xs font-semibold transition-all
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-amber-400 ${
                  statusFilter === "inactive"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-emerald-200 hover:bg-emerald-800/70"
                }`}
            >
              {/* <span
                className={`h-2 w-2 rounded-full ${
                  statusFilter === "inactive" ? "bg-amber-100" : "bg-amber-400"
                }`}
              /> */}
              Inactive
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md
              border border-emerald-700/60 bg-emerald-900/50
              px-3 py-2 text-xs font-medium text-emerald-100
              transition-colors hover:bg-emerald-800"
          >
            <span>⚙️</span>
            Customise
          </button>

          <button
            type="button"
            aria-pressed={showFilters}
            onClick={() => setShowFilters((previous) => !previous)}
            className={`inline-flex items-center gap-2 rounded-md
              border px-3 py-2 text-xs font-medium transition-colors ${
                showFilters
                  ? "border-emerald-400 bg-emerald-700 text-white"
                  : "border-emerald-700/60 bg-emerald-900/50 text-emerald-100 hover:bg-emerald-800"
              }`}
          >
            <span>🔻</span>
            Column Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px]">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-md border border-rose-800/70
                bg-rose-950/60 px-3 py-2 text-xs font-medium
                text-rose-200 transition-colors hover:bg-rose-900"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* <div className="flex flex-col sm:flex-row items-center justify-between bg-emerald-950 px-3 py-2 text-emerald-100 border-b border-emerald-900 gap-2">
        <div className="flex items-center gap-1.5 w-full">
          // Search
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search current page data..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full rounded-md bg-emerald-900/60 border border-emerald-700/50 px-3 py-1.5 pl-8 text-xs text-emerald-100 placeholder-emerald-400/70 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />

            // Active / Inactive Filter
            <div className="flex items-center gap-1 shrink-0 rounded-md border border-emerald-700/50 bg-emerald-900/60 p-1">
              <button
                type="button"
                aria-pressed={statusFilter === "active"}
                disabled={loading && statusFilter === "active"}
                onClick={() => handleStatusChange("active")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === "active"
                    ? "bg-emerald-500 text-white"
                    : "text-emerald-200 hover:bg-emerald-800"
                }`}
              >
                Active
              </button>

              <button
                type="button"
                aria-pressed={statusFilter === "inactive"}
                disabled={loading && statusFilter === "inactive"}
                onClick={() => handleStatusChange("inactive")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === "inactive"
                    ? "bg-amber-500 text-white"
                    : "text-emerald-200 hover:bg-emerald-800"
                }`}
              >
                Inactive
              </button>
            </div>

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

          // Customize
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 rounded-md bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/50 transition-colors shrink-0"
          >
            ⚙️ Customise Table
          </button>

          //Filters
          <button
            type="button"
            onClick={() => setShowFilters((previous) => !previous)}
            className={`relative p-1.5 rounded-md transition-colors border shrink-0 ${
              showFilters
                ? "bg-emerald-700 text-white border-emerald-500"
                : "bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/50"
            }`}
          >
            🔻 Column Filters
          </button>

          // Clear Filters
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-[11px] font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-200 px-2.5 py-1 rounded-md border border-rose-800/80 transition-colors shrink-0"
            >
              ✕ Clear ({activeFilterCount})
            </button>
          )}
        </div>

        // Selection count 
        <div className="text-xs text-emerald-300 font-medium self-end sm:self-auto whitespace-nowrap">
          {enableRowSelection && selectedIds.size > 0 && (
            <>{selectedIds.size} selected</>
          )}
        </div>
      </div> */}

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
            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 outline-none cursor-pointer"
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
              className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 disabled:opacity-40 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={
                loading || endRecord >= totalRecords || totalRecords === 0
              }
              onClick={() => setPage((previous) => previous + 1)}
              className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 disabled:opacity-40 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
