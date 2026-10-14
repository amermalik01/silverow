// app/components/setup/opening-balances/gl/components/GLAccountOpeningBalanceTable.tsx

"use client";

import { Icon } from "@iconify/react";
import NumericTextInput from "@/components/ui/NumericTextInput";

import type {
  GLAccountOpeningBalanceField,
  GLAccountOpeningBalanceFieldValue,
  GLAccountOpeningBalanceLineRow,
} from "../types";

type Props = {
  lines: GLAccountOpeningBalanceLineRow[];
  loading: boolean;
  disabled: boolean;

  onChange: (
    index: number,
    field: GLAccountOpeningBalanceField,
    value: GLAccountOpeningBalanceFieldValue,
  ) => void;

  onSelectAccount: (line: GLAccountOpeningBalanceLineRow) => void;
  onRemove: (line: GLAccountOpeningBalanceLineRow) => void;
};

function formatAmount(value: number): string {
  return Number(value || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function GLAccountOpeningBalanceTable({
  lines,
  loading,
  disabled,
  onChange,
  onSelectAccount,
  onRemove,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[1450px] text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <tr>
            <th className="p-2.5">Posting Date</th>
            <th className="p-2.5">Doc. No.</th>
            <th className="p-2.5">External Ref. No.</th>
            <th className="p-2.5">G/L No.</th>
            <th className="p-2.5">Name</th>
            <th className="p-2.5">Currency</th>
            <th className="p-2.5 text-right">Debit</th>
            <th className="p-2.5 text-right">Credit</th>
            <th className="p-2.5 text-right">Exchange Rate</th>
            <th className="p-2.5 text-right">Amount in LCY</th>
            <th className="p-2.5 text-center">Status</th>
            <th className="p-2.5 text-center">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <tr>
              <td colSpan={12} className="p-8 text-center text-slate-400">
                Loading GL account opening balances...
              </td>
            </tr>
          ) : lines.length === 0 ? (
            <tr>
              <td colSpan={12} className="p-8 text-center text-slate-400">
                No opening balance lines. Click Add Line to begin.
              </td>
            </tr>
          ) : (
            lines.map((line, index) => {
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
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900 disabled:bg-slate-100"
                    />
                  </td>

                  <td className="min-w-[120px] p-1.5">
                    <input
                      value={line.document_no}
                      disabled={rowDisabled}
                      onChange={(event) =>
                        onChange(index, "document_no", event.target.value)
                      }
                      placeholder="Document no."
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900 disabled:bg-slate-100"
                    />
                  </td>

                  <td className="min-w-[130px] p-1.5">
                    <input
                      value={line.external_ref_no}
                      disabled={rowDisabled}
                      onChange={(event) =>
                        onChange(index, "external_ref_no", event.target.value)
                      }
                      placeholder="External reference"
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900 disabled:bg-slate-100"
                    />
                  </td>

                  <td className="min-w-[125px] p-1.5">
                    <button
                      type="button"
                      title="Select G/L account"
                      disabled={rowDisabled}
                      onClick={() => onSelectAccount(line)}
                      className="flex h-8 w-full items-center justify-between gap-1 rounded border border-slate-200 bg-white px-2 text-left text-xs text-slate-800 hover:border-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <span className="truncate">
                        {line.gl_account_no || "Select account"}
                      </span>
                      <Icon
                        icon="solar:magnifer-linear"
                        width={14}
                        className="shrink-0 text-slate-400"
                      />
                    </button>
                  </td>

                  <td
                    className="max-w-[220px] truncate p-2 text-slate-600 dark:text-slate-400"
                    title={line.gl_account_name}
                  >
                    {line.gl_account_name || "—"}
                  </td>

                  <td className="min-w-[100px] p-1.5">
                    <input
                      value={line.currency_code}
                      maxLength={20}
                      disabled={rowDisabled}
                      onChange={(event) =>
                        onChange(
                          index,
                          "currency_code",
                          event.target.value.toUpperCase(),
                        )
                      }
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900 disabled:bg-slate-100"
                    />
                  </td>

                  <td className="min-w-[120px] p-1.5">
                    <NumericTextInput
                      value={line.debit}
                      allowDecimals
                      decimalScale={2}
                      disabled={rowDisabled}
                      onChange={(value) => {
                        const debit = Math.max(0, Number(value) || 0);

                        onChange(index, "debit", debit);
                        onChange(index, "credit", 0);
                      }}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-right text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                  </td>

                  <td className="min-w-[120px] p-1.5">
                    <NumericTextInput
                      value={line.credit}
                      allowDecimals
                      decimalScale={2}
                      disabled={rowDisabled}
                      onChange={(value) => {
                        const credit = Math.max(0, Number(value) || 0);

                        onChange(index, "credit", credit);
                        onChange(index, "debit", 0);
                      }}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-right text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                  </td>

                  <td className="min-w-[120px] p-1.5">
                    <NumericTextInput
                      value={line.exchange_rate}
                      allowDecimals
                      decimalScale={6}
                      disabled={rowDisabled}
                      onChange={(value) =>
                        onChange(
                          index,
                          "exchange_rate",
                          Math.max(0, Number(value) || 0),
                        )
                      }
                      className="w-full rounded border border-slate-200 px-2 py-1 text-right text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                  </td>

                  <td className="whitespace-nowrap p-2 text-right font-semibold text-slate-800 dark:text-slate-200">
                    {formatAmount(line.amount_lcy)}
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
                      className="rounded border border-slate-200 p-1.5 text-slate-500 hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
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
              <td colSpan={6} className="p-3 text-right font-semibold">
                Totals
              </td>
              <td className="p-3 text-right font-bold">
                {formatAmount(
                  lines.reduce((sum, line) => sum + line.debit, 0),
                )}
              </td>
              <td className="p-3 text-right font-bold">
                {formatAmount(
                  lines.reduce((sum, line) => sum + line.credit, 0),
                )}
              </td>
              <td />
              <td className="p-3 text-right font-bold">
                {formatAmount(
                  lines.reduce((sum, line) => sum + line.amount_lcy, 0),
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