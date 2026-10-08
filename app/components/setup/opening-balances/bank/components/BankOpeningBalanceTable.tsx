// app/components/setup/opening-balances/bank/components/BankOpeningBalanceTable.tsx

"use client";

import { Icon } from "@iconify/react";

import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

import type {
  BankOpeningBalanceRow,
  Currency,
  EditableBankOpeningBalanceField,
} from "../types";

type Props = {
  lines: BankOpeningBalanceRow[];
  currencies: Currency[];
  baseCurrencyCode: string;

  onChange: <K extends EditableBankOpeningBalanceField>(
    index: number,
    field: K,
    value: BankOpeningBalanceRow[K],
  ) => void;

  onRemove: (index: number) => void;

  onSelectBankGL: (index: number) => void;
};

export default function BankOpeningBalanceTable({
  lines,
  currencies,
  baseCurrencyCode,
  onChange,
  onRemove,
  onSelectBankGL,
}: Props) {
  const calculateAmountLCY = (line: BankOpeningBalanceRow): number => {
    return (
      (Number(line.debit || 0) - Number(line.credit || 0)) *
      Number(line.exchange_rate || 1)
    );
  };

  const formatLCY = (value: number): string => {
    const absValue = Math.abs(value).toFixed(2);

    return value < 0 ? `(${absValue})` : absValue;
  };

  return (
    <div className="overflow-x-auto border border-zinc-200 rounded">
      <table className="w-full text-left text-xs text-zinc-700 border-collapse min-w-[1300px]">
        <thead>
          <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
            <th className="p-2 w-28">Posting Date</th>
            <th className="p-2 w-24">Type</th>
            <th className="p-2 w-28">Doc. Type</th>
            <th className="p-2 w-28">Doc. No.</th>
            <th className="p-2 w-32">External Ref. No.</th>
            <th className="p-2 w-28">No.</th>
            <th className="p-2 w-48">Description</th>
            <th className="p-2 w-36">Bank G/L No.</th>
            <th className="p-2 w-24">Currency</th>
            <th className="p-2 w-24 text-right">Debit</th>
            <th className="p-2 w-24 text-right">Credit</th>
            <th className="p-2 w-24 text-center">Exchange Rate</th>
            <th className="p-2 w-32 text-right">Amount in LCY</th>
            <th className="p-2 w-12 text-center">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-200 bg-white">
          {lines.map((line, index) => {
            const amountLCY = calculateAmountLCY(line);

            return (
              <tr
                key={`${line.party_type}-${line.party_id}-${index}`}
                className="hover:bg-zinc-50 transition-colors"
              >
                {/* Posting Date */}
                <td className="p-1.5">
                  <DatePicker
                    id={`posting-date-${index}`}
                    value={
                      line.posting_date
                        ? new Date(line.posting_date)
                        : undefined
                    }
                    onChange={(date) => {
                      if (!date) return;

                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(
                        2,
                        "0",
                      );
                      const day = String(date.getDate()).padStart(2, "0");

                      const isoDate = `${year}-${month}-${day}`;

                      onChange(index, "posting_date", isoDate);
                    }}
                  />
                </td>

                {/* Party Type */}
                <td className="p-1.5 font-medium capitalize">
                  {line.party_type}
                </td>

                {/* Document Type */}
                <td className="p-1.5">
                  <select
                    value={line.doc_type}
                    onChange={(event) => {
                      const value = event.target.value as "Payment" | "Refund";

                      onChange(index, "doc_type", value);
                    }}
                    className="w-full border p-1 rounded bg-white"
                  >
                    <option value="Payment">Payment</option>
                    <option value="Refund">Refund</option>
                  </select>
                </td>

                {/* Document Number */}
                <td className="p-1.5">
                  <input
                    type="text"
                    value={line.doc_no}
                    onChange={(event) =>
                      onChange(index, "doc_no", event.target.value)
                    }
                    className="w-full border p-1 rounded font-mono"
                  />
                </td>

                {/* External Reference */}
                <td className="p-1.5">
                  <input
                    type="text"
                    value={line.external_ref_no}
                    onChange={(event) =>
                      onChange(index, "external_ref_no", event.target.value)
                    }
                    className="w-full border p-1 rounded font-mono"
                  />
                </td>

                {/* Party Code */}
                <td className="p-1.5 font-mono text-zinc-600 bg-zinc-50/50">
                  {line.party_code || ""}
                </td>

                {/* Party Name */}
                <td
                  className="p-1.5 truncate max-w-[180px]"
                  title={line.party_name}
                >
                  {line.party_name}
                </td>

                {/* Bank G/L */}
                <td className="p-1.5">
                  <div className="flex gap-1 items-center">
                    <input
                      type="text"
                      readOnly
                      placeholder="Select..."
                      value={line.bank_gl_code || ""}
                      className="w-full border p-1 rounded bg-zinc-50 font-mono text-center outline-none"
                    />

                    <Button
                      type="button"
                      onClick={() => onSelectBankGL(index)}
                      className="p-1 bg-zinc-100 hover:bg-zinc-200 border rounded text-zinc-600"
                    >
                      <Icon
                        icon="tabler:external-link"
                        className="w-3.5 h-3.5"
                      />
                    </Button>
                  </div>
                </td>

                {/* Currency */}
                <td className="p-1.5">
                  <select
                    value={line.currency_id}
                    onChange={(event) =>
                      onChange(index, "currency_id", event.target.value)
                    }
                    className="w-full border p-1 rounded font-semibold text-center bg-white"
                  >
                    <option value="">{baseCurrencyCode}</option>

                    {currencies
                      .filter((currency) => !currency.is_base)
                      .map((currency) => (
                        <option key={currency.id} value={currency.id}>
                          {currency.code}
                        </option>
                      ))}
                  </select>
                </td>

                {/* Debit */}
                <td className="p-1.5">
                  <NumericTextInput
                    value={Number(line.debit)}
                    allowDecimals
                    decimalScale={2}
                    onChange={(value) =>
                      onChange(index, "debit", Number(value))
                    }
                    className="w-full border p-1 rounded text-right"
                  />
                </td>

                {/* Credit */}
                <td className="p-1.5">
                  <NumericTextInput
                    value={Number(line.credit)}
                    allowDecimals
                    decimalScale={2}
                    onChange={(value) =>
                      onChange(index, "credit", Number(value))
                    }
                    className="w-full border p-1 rounded text-right"
                  />
                </td>

                {/* Exchange Rate */}
                <td className="p-1.5">
                  <NumericTextInput
                    value={Number(line.exchange_rate)}
                    allowDecimals
                    decimalScale={2}
                    onChange={(value) =>
                      onChange(index, "exchange_rate", Number(value))
                    }
                    className="w-full border p-1 rounded text-right"
                  />
                </td>

                {/* LCY */}
                <td className="p-1.5 text-right font-mono font-medium">
                  {formatLCY(amountLCY)}
                </td>

                {/* Remove */}
                <td className="p-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-zinc-400 hover:text-red-600 p-1 border rounded"
                  >
                    <Icon icon="tabler:x" className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}

          {lines.length === 0 && (
            <tr>
              <td colSpan={14} className="p-6 text-center text-zinc-400">
                No rows added yet. Click <strong>Select Suppliers</strong> or{" "}
                <strong>Select Customers</strong> above to start.
              </td>
            </tr>
          )}
        </tbody>

        {lines.length > 0 && (
          <tfoot>
            <tr className="border-t bg-zinc-50 font-bold">
              <td colSpan={12} className="p-2 text-right">
                Total
              </td>

              <td className="p-2 text-right font-mono">
                {formatLCY(
                  lines.reduce(
                    (total, line) => total + calculateAmountLCY(line),
                    0,
                  ),
                )}
              </td>

              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
