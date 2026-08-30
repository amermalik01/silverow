// app/components/parties/tabs/partyLedgerCellRenderers.tsx

import React from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";

export interface LedgerEntry {
  id: string;
  document_type: string;
  document_id?: string;
  document_no: string;
  posting_date: string;
  due_date?: string;
  description?: string;
  currency_code: string;
  exchange_rate: number;
  original_amount_fcy: number;
  remaining_amount_fcy: number;
  original_amount_lcy: number;
  remaining_amount_lcy: number;
  total_allocated?: number;
  is_open: boolean;
  on_hold: boolean;
  on_hold_reason?: string;
}

interface CellRendererOptions {
  partyType: "supplier" | "customer";
  slug?: string;
  lcyFormatter: Intl.NumberFormat;
  formatFCY: (val: number, currCode?: string) => string;
  getDocumentUrl: (
    type: string,
    id?: string,
    no?: string,
    partyType?: string,
    slug?: string
  ) => string;
  onViewAllocations: (row: LedgerEntry) => void;
  onHoldToggle: (row: LedgerEntry) => void;
  onAllocate: (row: LedgerEntry) => void;
}

export function getPartyLedgerCellRenderers({
  partyType,
  slug,
  lcyFormatter,
  formatFCY,
  getDocumentUrl,
  onViewAllocations,
  onHoldToggle,
  onAllocate,
}: CellRendererOptions) {
  return {
    posting_date: (row: LedgerEntry) => {
      if (!row.posting_date) return <span className="text-slate-500">—</span>;
      const d = row.posting_date.slice(0, 10);
      return (
        <span className="font-mono text-slate-600">
          {`${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`}
        </span>
      );
    },

    document_no: (row: LedgerEntry) => {
      const targetUrl = getDocumentUrl(
        row.document_type,
        row.document_id || row.document_no,
        row.document_no,
        partyType,
        slug
      );

      return targetUrl !== "#" ? (
        <Link
          href={targetUrl}
          target="_blank"
          className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          {row.document_no}
        </Link>
      ) : (
        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
          {row.document_no}
        </span>
      );
    },

    document_type: (row: LedgerEntry) => (
      <span className="uppercase text-[10px] font-medium text-slate-600 dark:text-slate-400">
        {row.document_type.replace(/_/g, " ")}
      </span>
    ),

    currency_code: (row: LedgerEntry) => (
      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300">
        {row.currency_code}
      </span>
    ),

    original_amount_fcy: (row: LedgerEntry) => (
      <span className="font-mono text-right block font-medium text-slate-800 dark:text-slate-200">
        {formatFCY(row.original_amount_fcy, row.currency_code)}
      </span>
    ),

    remaining_amount_fcy: (row: LedgerEntry) => (
      <span className="font-mono text-right block font-bold text-amber-600">
        {formatFCY(row.remaining_amount_fcy, row.currency_code)}
      </span>
    ),

    original_amount_lcy: (row: LedgerEntry) => (
      <span className="font-mono text-right block font-medium text-slate-500">
        {lcyFormatter.format(row.original_amount_lcy || 0)}
      </span>
    ),

    remaining_amount_lcy: (row: LedgerEntry) => (
      <span className="font-mono text-right block font-bold text-amber-600">
        {lcyFormatter.format(row.remaining_amount_lcy || 0)}
      </span>
    ),

    allocations: (row: LedgerEntry) => (
      <div className="text-center">
        <button
          onClick={() => onViewAllocations(row)}
          title="View Allocations"
          className="p-1 text-slate-500 hover:text-blue-600 transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Icon icon="tabler:eye" className="w-4 h-4 inline" />
        </button>
      </div>
    ),

    on_hold: (row: LedgerEntry) => (
      <div className="text-center">
        <button
          onClick={() => onHoldToggle(row)}
          className={`p-1 rounded ${
            row.on_hold
              ? "text-red-500 font-bold"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Icon icon="tabler:external-link" className="w-4 h-4 inline" />
        </button>
      </div>
    ),

    action: (row: LedgerEntry) => {
      const remBalance = Math.abs(row.remaining_amount_fcy || 0);
      const canAllocate = row.is_open && remBalance > 0;

      return (
        <div className="text-center">
          {canAllocate ? (
            <Button size="sm" variant="outline" onClick={() => onAllocate(row)}>
              Allocate
            </Button>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
      );
    },
  };
}