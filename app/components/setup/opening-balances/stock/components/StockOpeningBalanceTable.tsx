// app/components/setup/opening-balances/stock/components/StockOpeningBalanceTable.tsx

"use client";

import { Icon } from "@iconify/react";

import NumericTextInput from "@/components/ui/NumericTextInput";

import type {
  LocationOption,
  StockOpeningBalanceField,
  StockOpeningBalanceFieldValue,
  StockOpeningBalanceLineRow,
  WarehouseOption,
} from "../types";

type Props = {
  lines: StockOpeningBalanceLineRow[];
  warehouses: WarehouseOption[];
  locationsByWarehouse: Record<string, LocationOption[]>;
  loading: boolean;
  disabled: boolean;

  onChange: (
    index: number,
    field: StockOpeningBalanceField,
    value: StockOpeningBalanceFieldValue,
  ) => void;

  onWarehouseSelect: (index: number, warehouseId: string) => void;
  onRemove: (line: StockOpeningBalanceLineRow) => void;
};

function formatAmount(value: number): string {
  return Number(value || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function StockOpeningBalanceTable({
  lines,
  warehouses,
  locationsByWarehouse,
  loading,
  disabled,
  onChange,
  onWarehouseSelect,
  onRemove,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[1600px] text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <tr>
            <th className="p-2.5">Posting Date</th>
            <th className="p-2.5">Item No.</th>
            <th className="p-2.5">Description</th>
            <th className="p-2.5">U.O.M</th>
            <th className="p-2.5">Production Date</th>
            <th className="p-2.5">Date Received</th>
            <th className="p-2.5">Use by Date</th>
            <th className="p-2.5">Consignment No.</th>
            <th className="p-2.5">Reference No.</th>
            <th className="p-2.5">Batch No.</th>
            <th className="p-2.5">Warehouse</th>
            <th className="p-2.5">Location</th>
            <th className="p-2.5 text-right">Quantity</th>
            <th className="p-2.5 text-right">Unit Cost</th>
            <th className="p-2.5 text-right">Amount</th>
            <th className="p-2.5 text-center">Status</th>
            <th className="p-2.5 text-center">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <tr>
              <td colSpan={17} className="p-8 text-center text-slate-400">
                Loading stock opening balances...
              </td>
            </tr>
          ) : lines.length === 0 ? (
            <tr>
              <td colSpan={17} className="p-8 text-center text-slate-400">
                No stock opening balance lines. Click Select Items to begin.
              </td>
            </tr>
          ) : (
            lines.map((line, index) => {
              const availableLocations =
                locationsByWarehouse[line.warehouse_id] || [];

              const rowDisabled = disabled || Boolean(line.posted);

              return (
                <tr
                  key={line._stableKey}
                  className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <td className="min-w-[135px] p-1.5">
                    <input
                      type="date"
                      value={line.posting_date}
                      disabled={rowDisabled}
                      onChange={(event) =>
                        onChange(index, "posting_date", event.target.value)
                      }
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
                    />
                  </td>

                  <td className="min-w-[110px] p-2 font-medium text-slate-800 dark:text-slate-200">
                    {line.item_no}
                  </td>

                  <td
                    className="max-w-[200px] truncate p-2 text-slate-600 dark:text-slate-400"
                    title={line.item_description}
                  >
                    {line.item_description}
                  </td>

                  <td className="p-2">{line.uom}</td>

                  <td className="min-w-[135px] p-1.5">
                    <input
                      type="date"
                      value={line.production_date}
                      disabled={rowDisabled}
                      onChange={(event) =>
                        onChange(index, "production_date", event.target.value)
                      }
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
                    />
                  </td>

                  <td className="min-w-[135px] p-1.5">
                    <input
                      type="date"
                      value={line.date_received}
                      disabled={rowDisabled}
                      onChange={(event) =>
                        onChange(index, "date_received", event.target.value)
                      }
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
                    />
                  </td>

                  <td className="min-w-[135px] p-1.5">
                    <input
                      type="date"
                      value={line.use_by_date}
                      disabled={rowDisabled}
                      onChange={(event) =>
                        onChange(index, "use_by_date", event.target.value)
                      }
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
                    />
                  </td>

                  <td className="min-w-[120px] p-1.5">
                    <input
                      type="text"
                      value={line.consignment_no}
                      disabled={rowDisabled}
                      onChange={(event) =>
                        onChange(index, "consignment_no", event.target.value)
                      }
                      className="h-8 w-full rounded border border-slate-200 px-2 text-xs disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
                    />
                  </td>

                  <td className="min-w-[120px] p-1.5">
                    <input
                      type="text"
                      value={line.ref_no}
                      disabled={rowDisabled}
                      onChange={(event) =>
                        onChange(index, "ref_no", event.target.value)
                      }
                      className="h-8 w-full rounded border border-slate-200 px-2 text-xs disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
                    />
                  </td>

                  <td className="min-w-[120px] p-1.5">
                    <input
                      type="text"
                      value={line.batch_no}
                      disabled={rowDisabled}
                      onChange={(event) =>
                        onChange(index, "batch_no", event.target.value)
                      }
                      className="h-8 w-full rounded border border-slate-200 px-2 text-xs disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
                    />
                  </td>

                  <td className="min-w-[150px] p-1.5">
                    <select
                      value={line.warehouse_id}
                      disabled={rowDisabled}
                      onChange={(event) =>
                        onWarehouseSelect(index, event.target.value)
                      }
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.code
                            ? `${warehouse.code} - ${warehouse.name}`
                            : warehouse.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="min-w-[150px] p-1.5">
                    <select
                      value={line.location_id}
                      disabled={rowDisabled || !line.warehouse_id}
                      onChange={(event) =>
                        onChange(index, "location_id", event.target.value)
                      }
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="">Select location</option>
                      {availableLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.title}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="min-w-[110px] p-1.5">
                    <NumericTextInput
                      value={line.quantity}
                      allowDecimals
                      decimalScale={4}
                      onChange={(value) =>
                        onChange(index, "quantity", Number(value))
                      }
                      className="w-full rounded border border-slate-200 px-2 py-1 text-right text-xs dark:border-slate-700 dark:bg-slate-900"
                      disabled={rowDisabled}
                    />
                  </td>

                  <td className="min-w-[120px] p-1.5">
                    <NumericTextInput
                      value={line.unit_price}
                      allowDecimals
                      decimalScale={4}
                      onChange={(value) =>
                        onChange(index, "unit_price", Number(value))
                      }
                      className="w-full rounded border border-slate-200 px-2 py-1 text-right text-xs dark:border-slate-700 dark:bg-slate-900"
                      disabled={rowDisabled}
                    />
                  </td>

                  <td className="whitespace-nowrap p-2 text-right font-semibold text-slate-800 dark:text-slate-200">
                    {formatAmount(line.amount)}
                  </td>

                  <td className="p-2 text-center">
                    {line.posted ? (
                      <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Posted
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Open
                      </span>
                    )}
                  </td>

                  <td className="p-2 text-center">
                    <button
                      type="button"
                      title={
                        line.posted
                          ? "Posted rows cannot be deleted"
                          : "Remove opening balance"
                      }
                      disabled={rowDisabled}
                      onClick={() => onRemove(line)}
                      className="rounded border border-slate-200 p-1.5 text-slate-500 transition-colors hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
                    >
                      <Icon icon="solar:trash-bin-trash-linear" width={15} />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>

        {lines.length > 0 && (
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70">
              <td colSpan={14} className="p-3 text-right font-semibold">
                Total Stock Value
              </td>

              <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                {formatAmount(
                  lines.reduce((sum, line) => sum + line.amount, 0),
                )}
              </td>

              <td colSpan={2} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
