// app/components/DataTable/ColumnHeaderFilter.tsx

"use client";

import React from "react";
import { ColumnConfig, FilterValue } from "@/types/table";

interface Props {
  column: ColumnConfig;
  filters: FilterValue;
  onFilterChange: (columnKey: string, filterData: FilterValue[string]) => void;
}

export const ColumnHeaderFilter: React.FC<Props> = ({
  column,
  filters,
  onFilterChange,
}) => {
  const currentFilter = filters[column.columnKey] || { type: column.dataType };

  if (column.dataType === "date" || column.dataType === "number") {
    return (
      <div className="flex flex-col gap-1 w-full">
        <input
          type={column.dataType === "date" ? "date" : "number"}
          placeholder="From"
          value={currentFilter.from || ""}
          onChange={(e) =>
            onFilterChange(column.columnKey, {
              ...currentFilter,
              from: e.target.value,
            })
          }
          className="w-full rounded border border-emerald-800/80 bg-emerald-950/60 px-2 py-1 text-[11px] text-emerald-100 placeholder-emerald-400/60 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
        />
        <input
          type={column.dataType === "date" ? "date" : "number"}
          placeholder="To"
          value={currentFilter.to || ""}
          onChange={(e) =>
            onFilterChange(column.columnKey, {
              ...currentFilter,
              to: e.target.value,
            })
          }
          className="w-full rounded border border-emerald-800/80 bg-emerald-950/60 px-2 py-1 text-[11px] text-emerald-100 placeholder-emerald-400/60 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
        />
      </div>
    );
  }

  if (column.dataType === "select") {
    return (
      <select
        value={currentFilter.value || ""}
        onChange={(e) =>
          onFilterChange(column.columnKey, {
            ...currentFilter,
            value: e.target.value,
          })
        }
        className="w-full rounded border border-emerald-800/80 bg-emerald-950/60 px-2 py-1 text-xs text-emerald-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
      >
        <option value="" className="bg-emerald-950 text-emerald-100">
          All Statuses
        </option>
        {column.options?.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-emerald-950 text-emerald-100"
          >
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type="text"
      placeholder={`Filter ${column.label}...`}
      value={currentFilter.value || ""}
      onChange={(e) =>
        onFilterChange(column.columnKey, {
          ...currentFilter,
          value: e.target.value,
        })
      }
      className="w-full rounded border border-emerald-800/80 bg-emerald-950/60 px-2 py-1 text-xs text-emerald-100 placeholder-emerald-400/60 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
    />
  );
};

/* "use client";

import React from "react";
import { ColumnConfig, FilterValue } from "@/types/table";

interface Props {
  column: ColumnConfig;
  filters: FilterValue;
  onFilterChange: (columnKey: string, filterData: FilterValue[string]) => void;
}

export const ColumnHeaderFilter: React.FC<Props> = ({
  column,
  filters,
  onFilterChange,
}) => {
  const currentFilter = filters[column.columnKey] || { type: column.dataType };

  if (column.dataType === "date" || column.dataType === "number") {
    return (
      <div className="flex flex-col gap-1 text-xs">
        <input
          type={column.dataType === "date" ? "date" : "number"}
          placeholder="From"
          value={currentFilter.from || ""}
          onChange={(e) =>
            onFilterChange(column.columnKey, {
              ...currentFilter,
              from: e.target.value,
            })
          }
          className="w-full rounded border px-1 py-0.5 text-slate-800 outline-none text-[11px]"
        />
        <input
          type={column.dataType === "date" ? "date" : "number"}
          placeholder="To"
          value={currentFilter.to || ""}
          onChange={(e) =>
            onFilterChange(column.columnKey, {
              ...currentFilter,
              to: e.target.value,
            })
          }
          className="w-full rounded border px-1 py-0.5 text-slate-800 outline-none text-[11px]"
        />
      </div>
    );
  }

  if (column.dataType === "select") {
    return (
      <select
        value={currentFilter.value || ""}
        onChange={(e) =>
          onFilterChange(column.columnKey, {
            ...currentFilter,
            value: e.target.value,
          })
        }
        className="w-full rounded border px-1 py-0.5 text-xs text-slate-800 outline-none"
      >
        <option value="">All</option>
        {column.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type="text"
      placeholder="Filter..."
      value={currentFilter.value || ""}
      onChange={(e) =>
        onFilterChange(column.columnKey, {
          ...currentFilter,
          value: e.target.value,
        })
      }
      className="w-full rounded border px-1 py-0.5 text-xs text-slate-800 outline-none"
    />
  );
}; */
