// app/components/setup/SetupDataGridForm.tsx

"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";

import type { Field, Row } from "./setupDataGrid.types";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SetupDataGridFormProps {
  title: string;
  fields: Field[];
  form: Row;
  submitting: boolean;
  loading: boolean;

  onChange: (name: string, value: string | number) => void;

  onSubmit: () => void;

  onReset: () => void;
}

function SearchableSelectField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: Field;
  value: string | number | undefined;
  disabled: boolean;
  onChange: (val: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const options = field.options || [];

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Select
      value={value !== undefined && value !== null ? String(value) : ""}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        <SelectValue placeholder={`Select ${field.label || field.name}...`} />
      </SelectTrigger>
      <SelectContent
        searchable
        searchPlaceholder={`Search ${field.label || field.name}...`}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {filteredOptions.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No options found.
          </div>
        ) : (
          filteredOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

export default function SetupDataGridForm({
  title,
  fields,
  form,
  submitting,
  loading,
  onChange,
  onSubmit,
  onReset,
}: SetupDataGridFormProps) {
  const visibleFields = fields.filter((field) => field.type !== "hidden");

  const getInputValue = (value: string | number | undefined): string => {
    if (value === undefined || value === null) {
      return "";
    }

    return String(value);
  };

  return (
    <div className="px-2 py-4">
      <div
        className="
          rounded-xl
          border
          border-slate-200
          bg-slate-50/60
          p-3
          dark:border-slate-800
          dark:bg-slate-950/30
        "
      >
        {/* =====================================================
            Form Fields
            ===================================================== */}

        {visibleFields.length > 0 && (
          <div
            className="
              grid
              gap-2.5
            "
            style={{
              gridTemplateColumns: `repeat(${Math.min(
                visibleFields.length,
                4,
              )}, minmax(0, 1fr))`,
            }}
          >
            {visibleFields.map((field) => {
              /* =================================================
                  Select
                  ================================================= */

              if (field.type === "select") {
                return (
                  <SearchableSelectField
                    key={field.name}
                    field={field}
                    value={form[field.name]}
                    disabled={submitting}
                    onChange={(val) => onChange(field.name, val)}
                  />
                );
              }

              // if (field.type === "select") {
              //   return (
              //     <select
              //       key={field.name}
              //       value={getInputValue(
              //         form[field.name],
              //       )}
              //       disabled={submitting}
              //       onChange={(event) => {
              //         onChange(
              //           field.name,
              //           event.target.value,
              //         );
              //       }}
              //       className="
              //         h-10
              //         w-full
              //         rounded-lg
              //         border
              //         border-slate-200
              //         bg-white
              //         px-3
              //         text-xs
              //         text-slate-700
              //         outline-none
              //         transition
              //         focus:border-emerald-500
              //         focus:ring-2
              //         focus:ring-emerald-500/10
              //         disabled:cursor-not-allowed
              //         disabled:opacity-50
              //         dark:border-slate-700
              //         dark:bg-slate-900
              //         dark:text-slate-200
              //       "
              //     >
              //       <option value="">
              //         Select{" "}
              //         {field.label || field.name}
              //         ...
              //       </option>

              //       {field.options?.map(
              //         (option) => (
              //           <option
              //             key={option.value}
              //             value={option.value}
              //           >
              //             {option.label}
              //           </option>
              //         ),
              //       )}
              //     </select>
              //   );
              // }

              /* =================================================
                  Text / Number
                  ================================================= */

              return (
                <input
                  key={field.name}
                  type={field.type || "text"}
                  placeholder={field.label || field.name}
                  value={getInputValue(form[field.name])}
                  disabled={submitting}
                  onChange={(event) => {
                    const value =
                      field.type === "number"
                        ? event.target.value === ""
                          ? ""
                          : Number(event.target.value)
                        : event.target.value;

                    onChange(field.name, value);
                  }}
                  className="
                    h-10
                    w-full
                    rounded-lg
                    border
                    border-slate-200
                    bg-white
                    px-3
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
              );
            })}
          </div>
        )}

        {/* =====================================================
            Buttons
            ===================================================== */}

        <div className="mt-3 flex justify-end gap-2">
          {/* Reset */}

          <Button
            type="button"
            onClick={onReset}
            disabled={submitting}
            variant="outline"
            className="gap-1.5"
          >
            <Icon icon="solar:restart-linear" width={15} height={15} />
            Reset
          </Button>

          {/* Add */}

          <Button
            type="button"
            onClick={onSubmit}
            disabled={submitting || loading}
            variant="save"
            className="gap-1.5"
          >
            <Icon
              icon={
                submitting ? "solar:refresh-linear" : "solar:add-circle-linear"
              }
              width={16}
              height={16}
              className={submitting ? "animate-spin" : ""}
            />

            {submitting ? "Processing..." : "Add Record"}
          </Button>
        </div>
      </div>
    </div>
  );
}
