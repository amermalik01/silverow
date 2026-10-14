// app/components/setup/opening-balances/gl/GLAccountOpeningBalanceForm.tsx

"use client";

import { useGLAccountOpeningBalance } from "./hooks/useGLAccountOpeningBalance";

import GLAccountLookupModal, {
  type GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

import GLAccountOpeningBalanceToolbar from "./components/GLAccountOpeningBalanceToolbar";
import GLAccountOpeningBalanceTable from "./components/GLAccountOpeningBalanceTable";
import GLAccountOpeningBalanceSummary from "./components/GLAccountOpeningBalanceSummary";

export default function GLAccountOpeningBalanceForm() {
  const {
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
  } = useGLAccountOpeningBalance();

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading || submitting || posting}
            className="shrink-0 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          {successMessage}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <GLAccountOpeningBalanceToolbar
          loading={loading}
          submitting={submitting}
          posting={posting}
          hasLines={lines.length > 0}
          hasUnpostedLines={totals.unpostedCount > 0}
          onAddLine={handleAddLine}
          onRefresh={() => void loadData()}
        />

        <GLAccountOpeningBalanceTable
          lines={lines}
          loading={loading}
          disabled={submitting || posting}
          onChange={handleLineChange}
          onSelectAccount={(line) => setGlModalRowKey(line._stableKey)}
          onRemove={(line) => void handleDelete(line)}
        />

        <GLAccountOpeningBalanceSummary
          totalDebit={totals.totalDebit}
          totalCredit={totals.totalCredit}
          difference={totals.difference}
          totalLines={totals.totalLines}
          unpostedCount={totals.unpostedCount}
          loading={loading}
          submitting={submitting}
          posting={posting}
          onSave={() => void handleSave()}
          onPost={() => void handlePost()}
          onCancel={() => void handleCancel()}
        />
      </div>

      {glModalRowKey !== null && (
        <GLAccountLookupModal
          open
          onClose={() => setGlModalRowKey(null)}
          onSelect={(record: GLAccountLookupRecord) =>
            handleSelectAccount(record)
          }
        />
      )}
    </div>
  );
}
