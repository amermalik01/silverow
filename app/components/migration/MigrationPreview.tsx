// app/components/migration/MigrationPreview.tsx
"use client";

import type { MigrationRow } from "@/lib/migration/migration.types";

type Props = {
  rows: MigrationRow[];
  errors: Record<number, string[]>;
};

export default function MigrationPreview({ rows, errors }: Props) {
  const columns = Object.keys(rows[0] || {});

  return (
    <div className="border rounded-lg overflow-auto">
      <h3 className="p-3 font-semibold text-sm bg-slate-50 dark:bg-slate-800">
        Preview ({rows.length} rows)
      </h3>

      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="p-2 border-b w-16">Row</th>

            {columns.map((col) => (
              <th key={col} className="p-2 border-b text-left">
                {col}
              </th>
            ))}

            <th className="p-2 border-b text-left w-80">Validation</th>
          </tr>
        </thead>

        <tbody>
          {rows.slice(0, 20).map((row, index) => {
            const rowErrors = errors[index + 1] ?? [];

            return (
              <tr
                key={index}
                className={
                  rowErrors.length ? "bg-red-50 dark:bg-red-950/20" : ""
                }
              >
                <td className="p-2 border-b font-medium">{index + 1}</td>

                {columns.map((col) => (
                  <td key={col} className="p-2 border-b">
                    {String(row[col] ?? "")}
                  </td>
                ))}

                <td className="p-2 border-b">
                  {rowErrors.length > 0 ? (
                    <ul className="list-disc ml-4 text-red-600 space-y-1">
                      {rowErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-emerald-600">✓ OK</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length > 20 && (
        <div className="p-3 text-xs text-slate-500 border-t">
          Showing first 20 rows of {rows.length}.
        </div>
      )}
    </div>
  );
}
/* "use client";

import type { MigrationRow } from "@/lib/migration/migration.types";

type Props = {
  rows: MigrationRow[];
};

export default function MigrationPreview({ rows }: Props) {
  const columns = Object.keys(rows[0] || {});

  return (
    <div className="border rounded-lg overflow-auto">
      <h3 className="p-3 font-semibold text-sm bg-slate-50 dark:bg-slate-800">
        Preview ({rows.length} rows)
      </h3>

      {errors[index] && (
        <div className="text-red-500 text-xs mt-1">
          {errors[index].join(", ")}
        </div>
      )}

      <table className="min-w-full text-xs">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} className="p-2 border-b text-left">
                {col}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.slice(0, 20).map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td key={col} className="p-2 border-b">
                  {String(row[col] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
 */
