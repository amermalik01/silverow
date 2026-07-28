// app/components/migration/MigrationUploader.tsx

"use client";

import { useState, DragEvent } from "react";

import MigrationPreview from "./MigrationPreview";
import MigrationResult from "./MigrationResult";

import type {
  MigrationRow,
  MigrationUploadResponse,
  MigrationExecuteResponse,
} from "@/lib/migration/migration.types";

type Props = {
  purchaseOrder: {
    id?: string;
    order_no?: string;
    supplier_name?: string;
  };

  onCompleted?: () => void;
};

export default function MigrationUploader({
  purchaseOrder,
  onCompleted,
}: Props) {
  const purchaseOrderId = purchaseOrder.id ?? "";

  const [rows, setRows] = useState<MigrationRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);

  const [validationErrors, setValidationErrors] = useState<
    Record<number, string[]>
  >({});

  const [result, setResult] = useState<MigrationExecuteResponse | null>(null);

  async function validateRows(uploadRows: MigrationRow[]) {
    if (!purchaseOrderId) return;

    const response = await fetch("/api/migration/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        module: "PURCHASE_ORDER_LINES",
        purchase_order_id: purchaseOrderId,
        rows: uploadRows,
      }),
    });

    const data = await response.json();

    const errors: Record<number, string[]> = {};

    data.rows.forEach(
      (r: { row: number; success: boolean; errors: string[] }) => {
        if (!r.success) {
          errors[r.row] = r.errors;
        }
      },
    );

    setValidationErrors(errors);
  }

  async function uploadFile(file: File) {
    setLoading(true);
    setFileName(file.name);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch("/api/migration/upload", {
        method: "POST",
        body: formData,
      });

      const data: MigrationUploadResponse = await response.json();

      setRows(data.rows ?? []);

      await validateRows(data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function executeMigration() {
    if (!purchaseOrderId) {
      alert("Please save the Purchase Order first.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/migration/execute", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          module: "PURCHASE_ORDER_LINES",
          purchase_order_id: purchaseOrderId,
          rows,
        }),
      });

      const data: MigrationExecuteResponse = await response.json();

      setResult(data);

      if (data.failed === 0) {
        onCompleted?.();
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();

    const file = e.dataTransfer.files[0];

    if (file) {
      uploadFile(file);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">Target Purchase Order</div>

          <div className="font-semibold">{purchaseOrder.order_no}</div>

          <div className="text-sm text-slate-500">
            {purchaseOrder.supplier_name}
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.open("/api/migration/templates", "_blank")}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Download Template
        </button>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="rounded-xl border-2 border-dashed border-slate-300 p-10 text-center transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <div className="text-lg font-medium">Drag Excel File Here</div>

        <div className="mt-2 text-sm text-slate-500">or choose a file</div>

        <input
          type="file"
          accept=".xlsx,.xls"
          className="mt-5"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (file) {
              uploadFile(file);
            }
          }}
        />

        {fileName && (
          <div className="mt-4 text-sm font-medium text-blue-600">
            {fileName}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <MigrationPreview rows={rows} errors={validationErrors} />
      )}

      {rows.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={loading || Object.keys(validationErrors).length > 0}
            onClick={executeMigration}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Processing..." : "Execute Migration"}
          </button>
        </div>
      )}

      {result && <MigrationResult result={result} />}
    </div>
  );
}

/* 
"use client";

import { useState, DragEvent } from "react";

import MigrationPreview from "./MigrationPreview";
import MigrationResult from "./MigrationResult";

import type {
  MigrationRow,
  MigrationExecuteResponse,
  MigrationUploadResponse,
} from "@/lib/migration/migration.types";

type Props = {
  purchaseOrder: {
    id?: string;
    order_no?: string;
    supplier_name?: string;
  };
};

export default function MigrationUploader({ purchaseOrder }: Props) {
  const purchaseOrderId = purchaseOrder.id ?? "";

  const [rows, setRows] = useState<MigrationRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);

  const [validationErrors, setValidationErrors] = useState<
    Record<number, string[]>
  >({});

  const [result, setResult] = useState<MigrationExecuteResponse | null>(null);

  const validateRows = async (uploadRows: MigrationRow[]) => {
    if (!purchaseOrderId) return;

    const response = await fetch("/api/migration/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        module: "PURCHASE_ORDER_LINES",
        purchase_order_id: purchaseOrderId,
        rows: uploadRows,
      }),
    });

    const data = await response.json();

    const errors: Record<number, string[]> = {};

    data.rows.forEach(
      (r: { row: number; success: boolean; errors: string[] }) => {
        if (!r.success) {
          errors[r.row] = r.errors;
        }
      },
    );

    setValidationErrors(errors);
  };

  const uploadFile = async (file: File) => {
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const response = await fetch("/api/migration/upload", {
        method: "POST",
        body: formData,
      });

      const data: MigrationUploadResponse = await response.json();

      setRows(data.rows ?? []);

      await validateRows(data.rows ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];

    if (file) {
      await uploadFile(file);
    }
  };

  const executeMigration = async () => {
    if (!purchaseOrderId) {
      alert("Purchase Order has not been saved yet.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/migration/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          module: "PURCHASE_ORDER_LINES",
          purchase_order_id: purchaseOrderId,
          rows,
        }),
      });

      const data: MigrationExecuteResponse = await response.json();

      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 rounded-xl border bg-white p-5 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Import Purchase Order Items</h2>

        <button
          type="button"
          onClick={() => window.open("/api/migration/templates", "_blank")}
          className="rounded bg-slate-600 px-4 py-2 text-sm text-white"
        >
          Download Template
        </button>
      </div>

      <div className="rounded-lg border bg-slate-50 p-3 dark:bg-slate-800">
        <div className="text-xs text-slate-500">Target Purchase Order</div>

        <div className="font-medium">
          {purchaseOrder.order_no || "Unsaved Purchase Order"}
        </div>

        {purchaseOrder.supplier_name && (
          <div className="text-sm text-slate-500">
            {purchaseOrder.supplier_name}
          </div>
        )}
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="cursor-pointer rounded-xl border-2 border-dashed p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <p className="text-sm">Drag & Drop XLSX file here</p>

        <p className="mt-2 text-xs text-slate-500">or click below</p>

        <input
          type="file"
          accept=".xlsx,.xls"
          className="mt-3"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (file) {
              uploadFile(file);
            }
          }}
        />

        {fileName && (
          <div className="mt-2 text-xs text-blue-600">{fileName}</div>
        )}
      </div>

      {rows.length > 0 && (
        <MigrationPreview rows={rows} errors={validationErrors} />
      )}

      {rows.length > 0 && (
        <button
          type="button"
          disabled={loading || Object.keys(validationErrors).length > 0}
          onClick={executeMigration}
          className="rounded bg-blue-600 px-5 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? "Processing..." : "Execute Migration"}
        </button>
      )}

      {result && <MigrationResult result={result} />}
    </div>
  );
} */
