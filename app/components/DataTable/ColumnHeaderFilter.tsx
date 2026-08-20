// app/components/DataTable/ColumnHeaderFilter.tsx

"use client";

import React from "react";
import { ColumnConfig, FilterValue } from "@/types/table";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

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

  if (column.dataType === "date") {
    return (
      <div className="flex flex-col gap-1 w-full min-w-[130px]">
        <DatePicker
          value={
            currentFilter.from
              ? new Date(`${currentFilter.from}T00:00:00`)
              : undefined
          }
          onChange={(date) => {
            onFilterChange(column.columnKey, {
              ...currentFilter,
              from: date ? format(date, "yyyy-MM-dd") : "",
            });
          }}
          maxDate={
            currentFilter.to
              ? new Date(`${currentFilter.to}T00:00:00`)
              : undefined
          }
          placeholder="Start date"
          className="border border-emerald-800/80 rounded px-2 py-1 text-[11px] w-full bg-emerald-950/60 text-emerald-100 placeholder-emerald-400/60 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
        />

        <span className="text-[10px] text-emerald-400/80 text-center font-medium">
          to
        </span>

        {/* To Date Picker (Fixed: correctly sets `to` value) */}
        <DatePicker
          value={
            currentFilter.to
              ? new Date(`${currentFilter.to}T00:00:00`)
              : undefined
          }
          onChange={(date) => {
            onFilterChange(column.columnKey, {
              ...currentFilter,
              to: date ? format(date, "yyyy-MM-dd") : "",
            });
          }}
          minDate={
            currentFilter.from
              ? new Date(`${currentFilter.from}T00:00:00`)
              : undefined
          }
          placeholder="End date"
          className="border border-emerald-800/80 rounded px-2 py-1 text-[11px] w-full bg-emerald-950/60 text-emerald-100 placeholder-emerald-400/60 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
        />
      </div>
    );
  }

  if (column.dataType === "number") {
    return (
      <div className="flex flex-col gap-1 w-full min-w-[100px]">
        <input
          type="number"
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
          type="number"
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
          All
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
