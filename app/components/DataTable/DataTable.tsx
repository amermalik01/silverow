// app/components/DataTable/DataTable.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import {
  ColumnConfig,
  FetchParams,
  FetchResponse,
  FilterValue,
} from "@/types/table";
import { ColumnHeaderFilter } from "./ColumnHeaderFilter";
import { CustomisationModal } from "./CustomisationModal";

interface DataTableProps<T> {
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
  const customRender = renderRowCell ? renderRowCell(row, col.columnKey) : undefined;

  let cellValue: React.ReactNode = "-";
  if (customRender !== undefined) {
    cellValue = customRender;
  } else {
    const val = (row as Record<string, unknown>)[col.columnKey];
    if (val !== null && val !== undefined) {
      cellValue = typeof val === "object" ? String(val) : (val as React.ReactNode);
    }
  }

  return (
    <td
      style={{
        backgroundColor: col.headerColor ? `${col.headerColor}15` : undefined,
      }}
      className={`border-r border-slate-200 dark:border-slate-800 p-2 ${
        col.isPinned ? "sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-sm" : ""
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
        <input type="checkbox" className="accent-emerald-600 cursor-pointer rounded" />
      </td>
      {visibleColumns.map((col) => (
        <DataTableCell
          key={col.columnKey}
          row={row}
          col={col}
          renderRowCell={renderRowCell as (row: object, columnKey: string) => React.ReactNode}
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
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(undefined);
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

  const handleFilterChange = useCallback((columnKey: string, filterData: FilterValue[string]) => {
    setFilters((prev) => ({
      ...prev,
      [columnKey]: filterData,
    }));
    setPage(1);
  }, []);

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
    [columns]
  );

  const filteredData = useMemo(() => {
    if (!globalSearch.trim()) return data;
    const term = globalSearch.toLowerCase().trim();
    return data.filter((row) => {
      return visibleColumns.some((col) => {
        const rawVal = (row as Record<string, unknown>)[col.columnKey];
        return rawVal !== null && rawVal !== undefined && String(rawVal).toLowerCase().includes(term);
      });
    });
  }, [data, globalSearch, visibleColumns]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((f) => f && Boolean(f.value || f.from || f.to)).length;
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
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-emerald-400">🔍</span>
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
          {/* {totalRecords} Total Entries Found */}
        </div>
      </div>

      <div className="relative overflow-x-auto bg-white dark:bg-slate-900">
        <table className="w-full border-collapse table-fixed text-left text-xs">
          <thead>
            <tr className="bg-emerald-900 font-semibold text-emerald-50">
              <th className="w-10 border-r border-emerald-800 p-2 text-center">
                <input type="checkbox" className="accent-emerald-600 cursor-pointer rounded" />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.columnKey}
                  onClick={() => handleSortChange(col.columnKey)}
                  style={{
                    width: col.columnWidth ? `${col.columnWidth}px` : "auto",
                    backgroundColor: col.headerColor || undefined,
                  }}
                  className={`border-r border-emerald-800/80 p-2 font-bold capitalize tracking-wider text-[11px] select-none ${
                    col.columnKey !== "actions" ? "cursor-pointer hover:bg-emerald-800/60" : ""
                  } ${col.isPinned ? "sticky left-0 z-20 shadow-md" : ""}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>{col.label}</span>
                    {col.columnKey !== "actions" && (
                      <span className="text-[10px] text-emerald-300 opacity-80">
                        {sortBy === col.columnKey ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
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
              <tr>
                <td colSpan={visibleColumns.length + 1} className="p-12 text-center text-slate-400 font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <span className="animate-spin text-emerald-600">🌀</span>
                    Fetching records...
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="p-12 text-center text-slate-400 font-medium">
                  No data matching criteria.
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => {
                const rowObj = row as Record<string, unknown>;
                const rowId = ("id" in rowObj && (typeof rowObj.id === "string" || typeof rowObj.id === "number"))
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
            Showing <span className="font-bold">{totalRecords > 0 ? startRecord : 0}</span> to{" "}
            <span className="font-bold">{endRecord}</span>
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
}

/* "use client";

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import {
  ColumnConfig,
  FetchParams,
  FetchResponse,
  FilterValue,
} from "@/types/table";
import { ColumnHeaderFilter } from "./ColumnHeaderFilter";
import { CustomisationModal } from "./CustomisationModal";

interface DataTableProps<T> {
  moduleKey: string;
  fetchApi: (params: FetchParams) => Promise<FetchResponse<T>>;
  columnsConfigApi: {
    get: (moduleKey: string) => Promise<ColumnConfig[]>;
    save: (moduleKey: string, configs: ColumnConfig[]) => Promise<void>;
    reset: (moduleKey: string) => Promise<ColumnConfig[]>;
  };
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;
}

// Sub-component: Optimized Table Cell
const DataTableCell = memo(function DataTableCell<T extends object>({
  row,
  col,
  renderRowCell,
}: {
  row: T;
  col: ColumnConfig;
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;
}) {
  const customRender = renderRowCell ? renderRowCell(row, col.columnKey) : undefined;

  let cellValue: React.ReactNode = "-";
  if (customRender !== undefined) {
    cellValue = customRender;
  } else {
    const val = (row as Record<string, unknown>)[col.columnKey];
    if (val !== null && val !== undefined) {
      cellValue = typeof val === "object" ? String(val) : (val as React.ReactNode);
    }
  }

  return (
    <td
      style={{
        backgroundColor: col.headerColor ? `${col.headerColor}15` : undefined,
      }}
      className={`border-r border-slate-200 dark:border-slate-800 p-3 font-medium ${
        col.isPinned ? "sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-sm" : ""
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

// Sub-component: Optimized Table Row
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
      <td className="border-r border-slate-200 dark:border-slate-800 p-3 text-center">
        <input type="checkbox" className="accent-emerald-600 cursor-pointer rounded" />
      </td>
      {visibleColumns.map((col) => (
        <DataTableCell
          key={col.columnKey}
          row={row}
          col={col}
          renderRowCell={renderRowCell as (row: object, columnKey: string) => React.ReactNode}
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
  const [pageSize, setPageSize] = useState<number>(50);
  const [filters, setFilters] = useState<FilterValue>({});
  const [debouncedFilters, setDebouncedFilters] = useState<FilterValue>({});
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>("");

  useEffect(() => {
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

  const handleFilterChange = useCallback((columnKey: string, filterData: FilterValue[string]) => {
    setFilters((prev) => ({
      ...prev,
      [columnKey]: filterData,
    }));
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
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
    [columns]
  );

  const filteredData = useMemo(() => {
    if (!globalSearch.trim()) return data;
    const term = globalSearch.toLowerCase().trim();
    return data.filter((row) => {
      return visibleColumns.some((col) => {
        const rawVal = (row as Record<string, unknown>)[col.columnKey];
        return rawVal !== null && rawVal !== undefined && String(rawVal).toLowerCase().includes(term);
      });
    });
  }, [data, globalSearch, visibleColumns]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((f) => f && Boolean(f.value || f.from || f.to)).length;
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
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-emerald-400">🔍</span>
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
          {totalRecords} Total Entries Found
        </div>
      </div>


      <div className="relative overflow-x-auto bg-white dark:bg-slate-900">
        <table className="w-full border-collapse table-fixed text-left text-xs">
          <thead>
            <tr className="bg-emerald-900 font-semibold text-emerald-50">
              <th className="w-10 border-r border-emerald-800 p-3 text-center">
                <input type="checkbox" className="accent-emerald-600 cursor-pointer rounded" />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.columnKey}
                  onClick={() => handleSortChange(col.columnKey)}
                  style={{
                    width: col.columnWidth ? `${col.columnWidth}px` : "auto",
                    backgroundColor: col.headerColor || undefined,
                  }}
                  className={`border-r border-emerald-800/80 p-3 font-bold capitalize tracking-wider text-[11px] select-none ${
                    col.columnKey !== "actions" ? "cursor-pointer hover:bg-emerald-800/60" : ""
                  } ${col.isPinned ? "sticky left-0 z-20 shadow-md" : ""}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>{col.label}</span>
                    {col.columnKey !== "actions" && (
                      <span className="text-[10px] text-emerald-300 opacity-80">
                        {sortBy === col.columnKey ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
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
              <tr>
                <td colSpan={visibleColumns.length + 1} className="p-12 text-center text-slate-400 font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <span className="animate-spin text-emerald-600">🌀</span>
                    Fetching records...
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="p-12 text-center text-slate-400 font-medium">
                  No data matching criteria.
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => {
                const rowObj = row as Record<string, unknown>;
                const rowId = ("id" in rowObj && (typeof rowObj.id === "string" || typeof rowObj.id === "number"))
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


      <div className="flex flex-col sm:flex-row items-center justify-between border-t bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-600 dark:text-slate-300 gap-3">
        <div className="font-semibold">{totalRecords} Total Records</div>
        <div className="flex items-center gap-4">
          <div>
            Showing <span className="font-bold">{totalRecords > 0 ? startRecord : 0}</span> to{" "}
            <span className="font-bold">{endRecord}</span>
          </div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 outline-none font-medium cursor-pointer"
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

// Sub-component: Optimized Table Cell
/* const DataTableCell = memo(function DataTableCell<T extends object>({
  row,
  col,
  renderRowCell,
}: {
  row: T;
  col: ColumnConfig;
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;
}) {
  const customRender = renderRowCell ? renderRowCell(row, col.columnKey) : undefined;

  let cellValue: React.ReactNode = "-";
  if (customRender !== undefined) {
    cellValue = customRender;
  } else {
    const val = (row as Record<string, unknown>)[col.columnKey];
    if (val !== null && val !== undefined) {
      cellValue = typeof val === "object" ? String(val) : (val as React.ReactNode);
    }
  }

  return (
    <td
      style={{
        backgroundColor: col.headerColor ? `${col.headerColor}15` : undefined,
      }}
      className={`border-r border-slate-200 dark:border-slate-800 p-3 font-medium ${
        col.isPinned ? "sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-sm" : ""
      }`}
    >
      {cellValue}
    </td>
  );
});

// Sub-component: Optimized Table Row
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
      <td className="border-r border-slate-200 dark:border-slate-800 p-3 text-center">
        <input type="checkbox" className="accent-emerald-600 cursor-pointer rounded" />
      </td>
      {visibleColumns.map((col) => (
        <DataTableCell
          key={col.columnKey}
          row={row}
          col={col}
          renderRowCell={renderRowCell}
        />
      ))}
    </tr>
  );
}) as <T extends object>(props: {
  row: T;
  rowId: string | number;
  visibleColumns: ColumnConfig[];
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;
}) => React.JSX.Element; */

/* "use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ColumnConfig,
  FetchParams,
  FetchResponse,
  FilterValue,
} from "@/types/table";
import { ColumnHeaderFilter } from "./ColumnHeaderFilter";
import { CustomisationModal } from "./CustomisationModal";

interface DataTableProps<T> {
  moduleKey: string;
  fetchApi: (params: FetchParams) => Promise<FetchResponse<T>>;
  columnsConfigApi: {
    get: (moduleKey: string) => Promise<ColumnConfig[]>;
    save: (moduleKey: string, configs: ColumnConfig[]) => Promise<void>;
    reset: (moduleKey: string) => Promise<ColumnConfig[]>;
  };
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;
}

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
  const [pageSize, setPageSize] = useState<number>(50);
  const [filters, setFilters] = useState<FilterValue>({});
  const [debouncedFilters, setDebouncedFilters] = useState<FilterValue>({});
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(
    undefined,
  );
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // New Global Search state for existing paginated data
  const [globalSearch, setGlobalSearch] = useState<string>("");

  // Debounce Filters (300ms Delay)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);

    return () => clearTimeout(handler);
  }, [filters]);

  // Fetch Column Configurations
  const loadColumns = useCallback(async () => {
    try {
      const config = await columnsConfigApi.get(moduleKey);
      setColumns(config.sort((a, b) => a.columnOrder - b.columnOrder));
    } catch (err) {
      console.error("Failed to load column configuration:", err);
    }
  }, [moduleKey, columnsConfigApi]);

  // Fetch Paginated & Sorted Data
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

  const handleFilterChange = (
    columnKey: string,
    filterData: FilterValue[string],
  ) => {
    setFilters((prev) => ({
      ...prev,
      [columnKey]: filterData,
    }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

  // Toggle column sort order
  const handleSortChange = (columnKey: string) => {
    if (columnKey === "actions") return;

    if (sortBy !== columnKey) {
      setSortBy(columnKey);
      setSortOrder("asc");
    } else if (sortOrder === "asc") {
      setSortOrder("desc");
    } else {
      setSortBy(undefined);
      setSortOrder(undefined);
    }
    setPage(1);
  };

  const handleSaveCustomisation = async (updatedCols: ColumnConfig[]) => {
    await columnsConfigApi.save(moduleKey, updatedCols);
    setColumns(updatedCols);
    setIsModalOpen(false);
  };

  const handleResetDefault = async () => {
    const defaultConfig = await columnsConfigApi.reset(moduleKey);
    setColumns(defaultConfig);
    setIsModalOpen(false);
  };

  const getRowValue = (row: T, key: string): React.ReactNode => {
    const value = (row as Record<string, unknown>)[key];
    if (value === null || value === undefined) return "-";
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }
    return value as React.ReactNode;
  };

  const getRowId = (row: T, index: number): string | number => {
    const rowObj = row as Record<string, unknown>;
    if (
      "id" in rowObj &&
      (typeof rowObj.id === "string" || typeof rowObj.id === "number")
    ) {
      return rowObj.id;
    }
    return index;
  };

  const visibleColumns = useMemo(
    () => columns.filter((col) => col.isVisible),
    [columns],
  );

  // Filter current page data locally via Global Search Input
  const filteredData = useMemo(() => {
    if (!globalSearch.trim()) return data;

    const term = globalSearch.toLowerCase().trim();
    return data.filter((row) => {
      return visibleColumns.some((col) => {
        const rawVal = (row as Record<string, unknown>)[col.columnKey];
        if (rawVal === null || rawVal === undefined) return false;
        return String(rawVal).toLowerCase().includes(term);
      });
    });
  }, [data, globalSearch, visibleColumns]);

  const activeFilterCount = Object.values(filters).filter((f) => {
    if (!f) return false;
    return Boolean(f.value || f.from || f.to);
  }).length;

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
            title="Customise Table Columns"
            className="p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/50 transition-colors shrink-0"
          >
            ⚙️ Customise Table
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            title={showFilters ? "Hide Filter Row" : "Show Filter Row"}
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
              title="Clear All Filters"
              className="flex items-center gap-1 text-[11px] font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-200 px-2.5 py-1 rounded-lg border border-rose-800/80 transition-colors shrink-0"
            >
              ✕ Clear ({activeFilterCount})
            </button>
          )}
        </div>

        <div className="text-xs text-emerald-300 font-medium self-end sm:self-auto">
          {totalRecords} Total Entries Found
        </div>
      </div>


      <div className="relative overflow-x-auto bg-white dark:bg-slate-900">
        <table className="w-full border-collapse table-fixed text-left text-xs">
          <thead>
  
            <tr className="bg-emerald-900 font-semibold text-emerald-50">
              <th className="w-10 border-r border-emerald-800 p-3 text-center">
                <input
                  type="checkbox"
                  className="accent-emerald-600 cursor-pointer rounded"
                />
              </th>
              {visibleColumns.map((col) => {
                const isSorted = sortBy === col.columnKey;
                return (
                  <th
                    key={col.columnKey}
                    onClick={() => handleSortChange(col.columnKey)}
                    style={{
                      width: col.columnWidth ? `${col.columnWidth}px` : "auto",
                      backgroundColor: col.headerColor || undefined,
                    }}
                    className={`border-r border-emerald-800/80 p-3 font-bold capitalize tracking-wider text-[11px] select-none ${
                      col.columnKey !== "actions"
                        ? "cursor-pointer hover:bg-emerald-800/60"
                        : ""
                    } ${col.isPinned ? "sticky left-0 z-20 shadow-md" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>{col.label}</span>
                      {col.columnKey !== "actions" && (
                        <span className="text-[10px] text-emerald-300 opacity-80">
                          {isSorted ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>


            {showFilters && (
              <tr className="bg-emerald-900/90 border-b border-emerald-800">
                <td className="border-r border-emerald-800/80 p-2 text-center bg-emerald-900"></td>
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


          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="p-12 text-center text-slate-400 font-medium"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="animate-spin text-emerald-600">🌀</span>
                    Fetching records...
                  </div>
                </td>
              </tr>
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
              filteredData.map((row, idx) => (
                <tr
                  key={getRowId(row, idx)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <td className="border-r border-slate-200 dark:border-slate-800 p-3 text-center">
                    <input
                      type="checkbox"
                      className="accent-emerald-600 cursor-pointer rounded"
                    />
                  </td>
                  {visibleColumns.map((col) => (
                    <td
                      key={col.columnKey}
                      style={{
                        backgroundColor: col.headerColor
                          ? `${col.headerColor}15` // 15% opacity hex tint for whole body column
                          : undefined,
                      }}
                      className={`border-r border-slate-200 dark:border-slate-800 p-3 font-medium ${
                        col.isPinned
                          ? "sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-sm"
                          : ""
                      }`}
                    >
                      {renderRowCell
                        ? renderRowCell(row, col.columnKey)
                        : getRowValue(row, col.columnKey)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>


      <div className="flex flex-col sm:flex-row items-center justify-between border-t bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-600 dark:text-slate-300 gap-3">
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
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 outline-none font-medium cursor-pointer"
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
        onSave={handleSaveCustomisation}
        onResetDefault={handleResetDefault}
      />
    </div>
  );
}
 */
