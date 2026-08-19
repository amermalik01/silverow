// components/reports/ReportHeader.tsx
"use client";

import React from "react";
import { ArrowLeft, Printer, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportHeaderProps {
  title: string;
  subtitle: string;
  onExportPdf: () => void;
  onExportExcel: () => void;
  isProcessing: "pdf" | "xlsx" | null;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  subtitle,
  onExportPdf,
  onExportExcel,
  isProcessing,
}) => {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
      <div className="flex items-center space-x-4">
        <a
          href="./"
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:text-slate-800 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </a>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          disabled={isProcessing !== null}
          onClick={onExportPdf}
          className="flex items-center space-x-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          {isProcessing === "pdf" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Printer className="h-3.5 w-3.5" />
          )}
          <span>Print Preview</span>
        </Button>
        <Button
          disabled={isProcessing !== null}
          onClick={onExportExcel}
          className="flex items-center space-x-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          {isProcessing === "xlsx" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-3.5 w-3.5" />
          )}
          <span>Export Excel</span>
        </Button>
      </div>
    </div>
  );
};
