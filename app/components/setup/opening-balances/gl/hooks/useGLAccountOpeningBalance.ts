// app/components/setup/opening-balances/gl/hooks/useGLAccountOpeningBalance.ts

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { GLAccountLookupRecord } from "@/app/components/shared/modals/GLAccountLookupModal";

import {
  calculateAmountLCY,
  createGLOpeningBalanceRow,
  normalizeGLOpeningBalanceRows,
} from "../constants";

import type {
  GLAccountOpeningBalanceApiResponse,
  GLAccountOpeningBalanceField,
  GLAccountOpeningBalanceFieldValue,
  GLAccountOpeningBalanceLineRow,
} from "../types";

const API_BASE = "/api/finance/opening-balances/gl";
const POST_API = `${API_BASE}/post`;

function getErrorMessage(result: unknown, fallback: string): string {
  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return result.error;
  }

  return fallback;
}

export function useGLAccountOpeningBalance() {
  const [lines, setLines] = useState<GLAccountOpeningBalanceLineRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [posting, setPosting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [glModalRowKey, setGlModalRowKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(API_BASE, { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Failed to load GL opening balances."),
        );
      }

      setLines(normalizeGLOpeningBalanceRows(result));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load GL opening balances.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAddLine = useCallback(() => {
    const newLine = createGLOpeningBalanceRow();

    setLines((previous) => [...previous, newLine]);
    setGlModalRowKey(newLine._stableKey);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const handleSelectAccount = useCallback(
    (record: GLAccountLookupRecord) => {
      if (!glModalRowKey) return;

      setLines((previous) =>
        previous.map((line) =>
          line._stableKey === glModalRowKey && !line.posted
            ? {
                ...line,
                gl_account_id: record.id,
                gl_account_no: record.code,
                gl_account_name: record.name,
              }
            : line,
        ),
      );

      setGlModalRowKey(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    },
    [glModalRowKey],
  );

  const handleLineChange = useCallback(
    (
      index: number,
      field: GLAccountOpeningBalanceField,
      value: GLAccountOpeningBalanceFieldValue,
    ) => {
      setLines((previous) => {
        const current = previous[index];

        if (!current || current.posted) return previous;

        const updated = [...previous];
        const next = { ...current, [field]: value };

        if (field === "debit") {
          next.debit = Number(value) || 0;
          if (next.debit > 0) next.credit = 0;
        }

        if (field === "credit") {
          next.credit = Number(value) || 0;
          if (next.credit > 0) next.debit = 0;
        }

        if (field === "exchange_rate") {
          next.exchange_rate = Number(value) || 0;
        }

        if (
          field === "debit" ||
          field === "credit" ||
          field === "exchange_rate"
        ) {
          next.amount_lcy = calculateAmountLCY(
            next.debit,
            next.credit,
            next.exchange_rate,
          );
        }

        updated[index] = next;

        return updated;
      });

      setErrorMessage(null);
      setSuccessMessage(null);
    },
    [],
  );

  const validateLines = useCallback((): string | null => {
    if (lines.length === 0) {
      return "Please add at least one GL opening balance line.";
    }

    const accountIds = new Set<string>();

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const row = index + 1;

      if (line.posted) continue;

      if (!line.posting_date) {
        return `Posting date is required on row ${row}.`;
      }

      if (!line.gl_account_id) {
        return `G/L account is required on row ${row}.`;
      }

      if (accountIds.has(line.gl_account_id)) {
        return `Duplicate G/L account found on row ${row}. Remove duplicate accounts or combine their balances.`;
      }

      accountIds.add(line.gl_account_id);

      if (!line.currency_code.trim()) {
        return `Currency is required on row ${row}.`;
      }

      if (!Number.isFinite(line.debit) || line.debit < 0) {
        return `Debit cannot be negative on row ${row}.`;
      }

      if (!Number.isFinite(line.credit) || line.credit < 0) {
        return `Credit cannot be negative on row ${row}.`;
      }

      if (line.debit > 0 && line.credit > 0) {
        return `Enter either debit or credit, not both, on row ${row}.`;
      }

      if (line.debit === 0 && line.credit === 0) {
        return `Enter a debit or credit amount on row ${row}.`;
      }

      if (!Number.isFinite(line.exchange_rate) || line.exchange_rate <= 0) {
        return `Exchange rate must be greater than zero on row ${row}.`;
      }

      if (
        line.debit > 1e14 ||
        line.credit > 1e14 ||
        line.exchange_rate > 1e10
      ) {
        return `Numeric value exceeds the allowed range on row ${row}.`;
      }
    }

    if (lines.every((line) => line.posted)) {
      return "All GL opening balance lines have already been posted.";
    }

    return null;
  }, [lines]);

  const handleSave = useCallback(async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const validationError = validateLines();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines
            .filter((line) => !line.posted)
            .map(({ _stableKey, amount_lcy, posted, posted_at,
              general_ledger_document_no, ...line }) => line),
        }),
      });

      const result: GLAccountOpeningBalanceApiResponse =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to save GL opening balances.",
        );
      }

      setSuccessMessage(
        result.message || "GL opening balances saved successfully.",
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save GL opening balances.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [lines, validateLines, loadData]);

  const handleDelete = useCallback(
    async (line: GLAccountOpeningBalanceLineRow) => {
      if (line.posted) {
        setErrorMessage(
          "Posted GL opening balances cannot be deleted. Use the reversal process.",
        );
        return;
      }

      if (!line.id) {
        setLines((previous) =>
          previous.filter((row) => row._stableKey !== line._stableKey),
        );
        setErrorMessage(null);
        setSuccessMessage(null);
        return;
      }

      if (
        !window.confirm(
          `Delete opening balance for ${line.gl_account_no || line.gl_account_name}?`,
        )
      ) {
        return;
      }

      setSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(
          `${API_BASE}/${encodeURIComponent(line.id)}`,
          { method: "DELETE" },
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Failed to delete GL opening balance."),
          );
        }

        setSuccessMessage("GL opening balance deleted successfully.");
        await loadData();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to delete GL opening balance.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [loadData],
  );

  const handlePost = useCallback(async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const validationError = validateLines();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const unpostedLines = lines.filter((line) => !line.posted);

    if (unpostedLines.some((line) => !line.id)) {
      setErrorMessage("Save all opening balance lines before posting.");
      return;
    }

    const totalDebit = unpostedLines.reduce(
      (sum, line) => sum + line.debit,
      0,
    );
    const totalCredit = unpostedLines.reduce(
      (sum, line) => sum + line.credit,
      0,
    );

    if (Math.abs(totalDebit - totalCredit) >= 0.005) {
      setErrorMessage(
        `The opening balance journal is not balanced. Debit: ${totalDebit.toFixed(2)}, credit: ${totalCredit.toFixed(2)}.`,
      );
      return;
    }

    if (
      !window.confirm(
        `Post ${unpostedLines.length} GL opening balance line(s) to the general ledger? This action should not be repeated.`,
      )
    ) {
      return;
    }

    setPosting(true);

    try {
      const response = await fetch(POST_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: unpostedLines.map((line) => line.id),
        }),
      });

      const result: GLAccountOpeningBalanceApiResponse =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to post GL opening balances.",
        );
      }

      setSuccessMessage(
        result.message || "GL opening balances posted successfully.",
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to post GL opening balances.",
      );
    } finally {
      setPosting(false);
    }
  }, [lines, validateLines, loadData]);

  const handleCancel = useCallback(() => {
    if (submitting || posting || loading) return;

    if (
      lines.some((line) => !line.posted) &&
      !window.confirm(
        "Cancel this screen? Unsaved changes will be discarded when the records are reloaded.",
      )
    ) {
      return;
    }

    void loadData();
  }, [lines, submitting, posting, loading, loadData]);

  const totals = useMemo(() => {
    const totalDebit = lines.reduce(
      (sum, line) => sum + Number(line.debit || 0),
      0,
    );

    const totalCredit = lines.reduce(
      (sum, line) => sum + Number(line.credit || 0),
      0,
    );

    return {
      totalDebit,
      totalCredit,
      difference: Number((totalDebit - totalCredit).toFixed(2)),
      totalLines: lines.length,
      unpostedCount: lines.filter((line) => !line.posted).length,
    };
  }, [lines]);

  return {
    lines,
    loading,
    submitting,
    posting,
    errorMessage,
    successMessage,
    totals,
    glModalRowKey,
    setGlModalRowKey,
    handleAddLine,
    handleLineChange,
    handleSelectAccount,
    handleDelete,
    handleSave,
    handlePost,
    handleCancel,
    loadData,
  };
}