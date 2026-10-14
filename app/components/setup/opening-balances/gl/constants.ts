// app/components/setup/opening-balances/gl/constants.ts

import type { GLAccountLookupRecord } from "@/app/components/shared/modals/GLAccountLookupModal";
import type { GLAccountOpeningBalanceLineRow } from "./types";

export function createStableKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `gl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
}

export function formatDateOnly(value: unknown): string {
  if (!value) return "";

  const stringValue = String(value);
  return stringValue.includes("T")
    ? stringValue.split("T")[0]
    : stringValue.slice(0, 10);
}

export function calculateAmountLCY(
  debit: number,
  credit: number,
  exchangeRate: number,
): number {
  return Number(
    (
      (Number(debit || 0) - Number(credit || 0)) *
      Number(exchangeRate || 0)
    ).toFixed(2),
  );
}

export function createGLOpeningBalanceRow(
  account?: GLAccountLookupRecord,
): GLAccountOpeningBalanceLineRow {
  const postingDate = new Date().toISOString().slice(0, 10);

  return {
    _stableKey: createStableKey(),

    posting_date: postingDate,
    document_no: "",
    external_ref_no: "",

    gl_account_id: account?.id ?? "",
    gl_account_no: account?.code ?? "",
    gl_account_name: account?.name ?? "",

    currency_code: "GBP",
    debit: 0,
    credit: 0,
    exchange_rate: 1,
    amount_lcy: 0,

    posted: false,
    posted_at: null,
    general_ledger_document_no: null,
  };
}

export function normalizeGLOpeningBalanceRows(
  result: unknown,
): GLAccountOpeningBalanceLineRow[] {
  const rows = Array.isArray(result)
    ? result
    : typeof result === "object" &&
        result !== null &&
        "data" in result &&
        Array.isArray(result.data)
      ? result.data
      : [];

  return rows.map((value: unknown) => {
    const row = value as Record<string, unknown>;

    const debit = Number(row.debit ?? 0);
    const credit = Number(row.credit ?? 0);
    const exchangeRate = Number(row.exchange_rate ?? 1);

    return {
      _stableKey: String(row.id ?? createStableKey()),
      id: row.id ? String(row.id) : undefined,

      posting_date: formatDateOnly(row.posting_date),
      document_no: String(row.document_no ?? ""),
      external_ref_no: String(row.external_ref_no ?? ""),

      gl_account_id: String(row.gl_account_id ?? ""),
      gl_account_no: String(row.gl_account_no ?? ""),
      gl_account_name: String(row.gl_account_name ?? ""),

      currency_code: String(row.currency_code ?? "GBP"),
      debit,
      credit,
      exchange_rate: Number(row.exchange_rate ?? 1),
      amount_lcy: calculateAmountLCY(debit, credit, exchangeRate),

      posted: row.status === "Posted" || row.posted === true,
      posted_at: row.posted_at ? String(row.posted_at) : null,
      general_ledger_document_no: row.general_ledger_document_no
        ? String(row.general_ledger_document_no)
        : null,
    };
  });
}
