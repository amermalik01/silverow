// app/components/migration/MigrationResult.tsx
"use client";

import type { MigrationExecuteResponse } from "@/lib/migration/migration.types";

type Props = {
  result: MigrationExecuteResponse;
};

export default function MigrationResult({ result }: Props) {
  return (
    <div className="border rounded-lg p-4 space-y-2 bg-slate-50 dark:bg-slate-800">
      <h3 className="font-semibold">Migration Result</h3>

      <div className="text-sm">Total: {result.total}</div>

      <div className="text-green-600">Success: {result.success}</div>

      <div className="text-red-600">Failed: {result.failed}</div>

      {result.rows
        ?.filter((r) => !r.success)
        .map((r, i) => (
          <div key={i} className="text-xs text-red-500">
            Row {r.row}: {r.errors?.join(", ")}
          </div>
        ))}
    </div>
  );
}
