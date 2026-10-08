// app/components/setup/opening-balances/stock/StockOpeningBalanceForm.tsx

"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";
import ItemLookupModal from "@/app/components/shared/modals/ItemLookupModal";
import { useStockOpeningBalance } from "./hooks/useStockOpeningBalance";

export default function StockOpeningBalanceForm() {
  const {
    lines,
    loading,
    submitting,
    errorMessage,
    warehouses,
    locationsByWarehouse,
    isItemModalOpen,
    totalDebitAmount,
    setIsItemModalOpen,
    handleMultipleItemSelect,
    handleLineChange,
    handleWarehouseSelect,
    removeLineRow,
    handleSave,
  } = useStockOpeningBalance();

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3 bg-red-100 text-red-800 rounded font-medium text-xs border border-red-200">
          {errorMessage}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 space-y-4">
        {/* Action Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <Button
            type="button"
            onClick={() => setIsItemModalOpen(true)}
            disabled={submitting || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 h-auto rounded-md shadow-xs flex items-center gap-1.5"
          >
            <Icon icon="solar:add-circle-linear" width={16} />
            Select Item
          </Button>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs text-left min-w-[1400px]">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-2.5 w-28">Posting Date</th>
                <th className="p-2.5 w-24">Item No.</th>
                <th className="p-2.5 min-w-[150px]">Description</th>
                <th className="p-2.5 w-16">U.O.M</th>
                <th className="p-2.5 w-28">Production Date</th>
                <th className="p-2.5 w-28">Date Received</th>
                <th className="p-2.5 w-28">Use by Date</th>
                <th className="p-2.5 w-24">Consgn. No.</th>
                <th className="p-2.5 w-24">Ref. No.</th>
                <th className="p-2.5 w-24">Batch No.</th>
                <th className="p-2.5 w-32">Warehouse</th>
                <th className="p-2.5 w-32">Location</th>
                <th className="p-2.5 w-20 text-right">Qty.</th>
                <th className="p-2.5 w-24 text-right">Unit Price</th>
                <th className="p-2.5 w-28 text-right">Amount</th>
                <th className="p-2.5 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={16} className="p-6 text-center text-slate-400">
                    Loading opening balance records...
                  </td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td colSpan={16} className="p-6 text-center text-slate-400">
                    No items selected. Click Select Item to add stock opening
                    entries.
                  </td>
                </tr>
              ) : (
                lines.map((line, index) => {
                  const availableLocations =
                    locationsByWarehouse[line.warehouse_id] || [];

                  return (
                    <tr
                      key={line._stableKey}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Posting Date */}
                      <td className="p-2">
                        <input
                          type="date"
                          value={line.posting_date}
                          onChange={(e) =>
                            handleLineChange(
                              index,
                              "posting_date",
                              e.target.value,
                            )
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs dark:bg-slate-800"
                        />
                      </td>

                      {/* Item No. */}
                      <td className="p-2 font-medium text-slate-800 dark:text-slate-200">
                        {line.item_no}
                      </td>

                      {/* Description */}
                      <td
                        className="p-2 truncate max-w-[180px] text-slate-600 dark:text-slate-400"
                        title={line.item_description}
                      >
                        {line.item_description}
                      </td>

                      {/* UOM */}
                      <td className="p-2 text-slate-500">{line.uom}</td>

                      {/* Production Date */}
                      <td className="p-2">
                        <input
                          type="date"
                          value={line.production_date || ""}
                          onChange={(e) =>
                            handleLineChange(
                              index,
                              "production_date",
                              e.target.value,
                            )
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs dark:bg-slate-800"
                        />
                      </td>

                      {/* Date Received */}
                      <td className="p-2">
                        <input
                          type="date"
                          value={line.date_received || ""}
                          onChange={(e) =>
                            handleLineChange(
                              index,
                              "date_received",
                              e.target.value,
                            )
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs dark:bg-slate-800"
                        />
                      </td>

                      {/* Use by Date */}
                      <td className="p-2">
                        <input
                          type="date"
                          value={line.use_by_date || ""}
                          onChange={(e) =>
                            handleLineChange(
                              index,
                              "use_by_date",
                              e.target.value,
                            )
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs dark:bg-slate-800"
                        />
                      </td>

                      {/* Consignment No */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={line.consignment_no || ""}
                          onChange={(e) =>
                            handleLineChange(
                              index,
                              "consignment_no",
                              e.target.value,
                            )
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs dark:bg-slate-800"
                        />
                      </td>

                      {/* Ref No */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={line.ref_no || ""}
                          onChange={(e) =>
                            handleLineChange(index, "ref_no", e.target.value)
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs dark:bg-slate-800"
                        />
                      </td>

                      {/* Batch No */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={line.batch_no || ""}
                          onChange={(e) =>
                            handleLineChange(index, "batch_no", e.target.value)
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs dark:bg-slate-800"
                        />
                      </td>

                      {/* Warehouse Select */}
                      <td className="p-2">
                        <select
                          value={line.warehouse_id}
                          onChange={(e) =>
                            handleWarehouseSelect(index, e.target.value)
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs dark:bg-slate-800"
                        >
                          <option value="">Select...</option>
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Location Select */}
                      <td className="p-2">
                        <select
                          value={line.location_id}
                          onChange={(e) =>
                            handleLineChange(
                              index,
                              "location_id",
                              e.target.value,
                            )
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs dark:bg-slate-800"
                        >
                          <option value="">Select...</option>
                          {availableLocations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.title}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Qty */}
                      <td className="p-2 text-right">
                        <NumericTextInput
                          value={line.quantity}
                          onChange={(val) =>
                            handleLineChange(index, "quantity", Number(val))
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-right dark:bg-slate-800"
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="p-2 text-right">
                        <NumericTextInput
                          allowDecimals
                          decimalScale={2}
                          value={line.unit_price}
                          onChange={(val) =>
                            handleLineChange(index, "unit_price", Number(val))
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-right dark:bg-slate-800"
                        />
                      </td>

                      {/* Calculated Amount */}
                      <td className="p-2 text-right font-medium text-slate-800 dark:text-slate-200">
                        {line.amount.toFixed(2)}
                      </td>

                      {/* Action */}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLineRow(index)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                        >
                          <Icon icon="solar:close-circle-linear" width={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Summary Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
            Total Amount for Debit:{" "}
            <span className="text-slate-900 dark:text-white text-sm font-bold ml-2">
              {totalDebitAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handleSave}
              disabled={submitting || loading || lines.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-lg"
            >
              {submitting ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
              disabled={submitting}
              className="text-xs px-4 py-2 rounded-lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Item Selection Modal */}
      {isItemModalOpen && (
        <ItemLookupModal
          open={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          onSelectMultiple={handleMultipleItemSelect}
        />
      )}
    </div>
  );
}
