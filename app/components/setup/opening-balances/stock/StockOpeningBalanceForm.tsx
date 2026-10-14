// app/components/setup/opening-balances/stock/StockOpeningBalanceForm.tsx

"use client";

import { useStockOpeningBalance } from "./hooks/useStockOpeningBalance";

import ItemLookupModal from "@/app/components/shared/modals/ItemLookupModal";

import StockOpeningBalanceToolbar from "./components/StockOpeningBalanceToolbar";
import StockOpeningBalanceTable from "./components/StockOpeningBalanceTable";
import StockOpeningBalanceSummary from "./components/StockOpeningBalanceSummary";

export default function StockOpeningBalanceForm() {
  const {
    lines,
    loading,
    submitting,
    posting,
    errorMessage,
    successMessage,
    warehouses,
    locationsByWarehouse,
    isItemModalOpen,
    totalDebitAmount,
    unpostedCount,
    setIsItemModalOpen,
    handleMultipleItemSelect,
    handleLineChange,
    handleWarehouseSelect,
    handleDelete,
    handleSave,
    handlePost,
    loadData,
  } = useStockOpeningBalance();

  const handleCancel = () => {
    if (submitting || posting) {
      return;
    }

    if (
      lines.some((line) => !line.posted) &&
      !window.confirm(
        "Cancel this screen? Unsaved changes will be discarded when the records are reloaded.",
      )
    ) {
      return;
    }

    void loadData();
  };

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
        <StockOpeningBalanceToolbar
          loading={loading}
          submitting={submitting}
          posting={posting}
          hasLines={lines.length > 0}
          hasUnpostedLines={unpostedCount > 0}
          onSelectItems={() => setIsItemModalOpen(true)}
          onRefresh={() => void loadData()}
        />

        <StockOpeningBalanceTable
          lines={lines}
          warehouses={warehouses}
          locationsByWarehouse={locationsByWarehouse}
          loading={loading}
          disabled={submitting || posting}
          onChange={handleLineChange}
          onWarehouseSelect={handleWarehouseSelect}
          onRemove={(line) => void handleDelete(line)}
        />

        <StockOpeningBalanceSummary
          totalAmount={totalDebitAmount}
          totalLines={lines.length}
          unpostedCount={unpostedCount}
          loading={loading}
          submitting={submitting}
          posting={posting}
          onSave={() => void handleSave()}
          onPost={() => void handlePost()}
          onCancel={handleCancel}
        />
      </div>

      {isItemModalOpen && (
        <ItemLookupModal
          open={isItemModalOpen}
          multiple
          onClose={() => setIsItemModalOpen(false)}
          onSelectMultiple={handleMultipleItemSelect}
        />
      )}
    </div>
  );
}
