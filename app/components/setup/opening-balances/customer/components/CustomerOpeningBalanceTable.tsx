// app/components/setup/opening-balances/customer/components/CustomerOpeningBalanceTable.tsx

"use client";

import { Icon } from "@iconify/react";
import { DatePicker } from "@/components/ui/date-picker";
import NumericTextInput from "@/components/ui/NumericTextInput";

import type { CustomerOpeningBalanceRow, Currency } from "../types";

type CustomerOpeningBalanceField = keyof CustomerOpeningBalanceRow;

type CustomerOpeningBalanceFieldValue =
  CustomerOpeningBalanceRow[CustomerOpeningBalanceField];

type Props = {
  lines: CustomerOpeningBalanceRow[];
  currencies: Currency[];
  baseCurrencyCode: string;

  onChange: (
    index: number,
    field: CustomerOpeningBalanceField,
    value: CustomerOpeningBalanceFieldValue,
  ) => void;

  onRemove: (index: number) => void;
};

export default function CustomerOpeningBalanceTable({
  lines,
  currencies,
  baseCurrencyCode,
  onChange,
  onRemove,
}: Props) {
  const calculateAmountLCY = (line: CustomerOpeningBalanceRow): number => {
    return (
      (Number(line.debit || 0) - Number(line.credit || 0)) *
      Number(line.exchange_rate || 1)
    );
  };

  const formatLCY = (value: number): string => {
    const absValue = Math.abs(value).toFixed(2);

    return value < 0 ? `(${absValue})` : absValue;
  };

  const totalLCY = lines.reduce(
    (total, line) => total + calculateAmountLCY(line),
    0,
  );

  return (
    <div className="overflow-x-auto border border-zinc-200 rounded">
      <table className="w-full text-left text-xs text-zinc-700 border-collapse min-w-[1300px]">
        <thead className="bg-zinc-50 border-b border-zinc-200">
          <tr>
            <th className="p-2 font-semibold whitespace-nowrap">
              Posting Date
            </th>

            <th className="p-2 font-semibold whitespace-nowrap">Doc. Type</th>

            <th className="p-2 font-semibold whitespace-nowrap">Doc. No.</th>

            <th className="p-2 font-semibold whitespace-nowrap">
              External Ref. No.
            </th>

            <th className="p-2 font-semibold whitespace-nowrap">No.</th>

            <th className="p-2 font-semibold whitespace-nowrap">Description</th>

            <th className="p-2 font-semibold whitespace-nowrap">Currency</th>

            <th className="p-2 font-semibold whitespace-nowrap text-right">
              Debit
            </th>

            <th className="p-2 font-semibold whitespace-nowrap text-right">
              Credit
            </th>

            <th className="p-2 font-semibold whitespace-nowrap text-right">
              Exchange Rate
            </th>

            <th className="p-2 font-semibold whitespace-nowrap text-right">
              Amount in LCY
            </th>

            <th className="p-2 font-semibold whitespace-nowrap text-center">
              Action
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-200 bg-white">
          {lines.map((line, index) => (
            <tr
              key={`${line.customer_id}-${index}`}
              className="hover:bg-zinc-50"
            >
              {/* Posting Date */}
              <td className="p-1.5 min-w-[140px]">
                <DatePicker
                  id={`customer-posting-date-${index}`}
                  value={
                    line.posting_date
                      ? new Date(`${line.posting_date}T00:00:00`)
                      : undefined
                  }
                  onChange={(date) => {
                    if (!date) {
                      return;
                    }

                    const iso = date.toISOString().split("T")[0];

                    onChange(index, "posting_date", iso);
                  }}
                />
              </td>

              {/* Document Type */}
              <td className="p-1.5 min-w-[140px]">
                <select
                  value={line.doc_type}
                  onChange={(event) => {
                    const value = event.target
                      .value as CustomerOpeningBalanceRow["doc_type"];

                    onChange(index, "doc_type", value);
                  }}
                  className="w-full h-8 rounded border border-zinc-300 bg-white px-2 text-xs outline-none focus:border-emerald-600"
                >
                  <option value="Invoice">Invoice</option>

                  <option value="Credit Note">Credit Note</option>
                </select>
              </td>

              {/* Document Number */}
              <td className="p-1.5 min-w-[130px]">
                <input
                  type="text"
                  value={line.doc_no}
                  onChange={(event) =>
                    onChange(index, "doc_no", event.target.value)
                  }
                  className="w-full h-8 rounded border border-zinc-300 px-2 text-xs outline-none focus:border-emerald-600"
                />
              </td>

              {/* External Reference */}
              <td className="p-1.5 min-w-[150px]">
                <input
                  type="text"
                  value={line.external_ref_no}
                  onChange={(event) =>
                    onChange(index, "external_ref_no", event.target.value)
                  }
                  className="w-full h-8 rounded border border-zinc-300 px-2 text-xs outline-none focus:border-emerald-600"
                />
              </td>

              {/* Customer Number */}
              <td className="p-1.5 min-w-[120px]">
                <div className="h-8 flex items-center px-2 text-xs font-medium text-zinc-700">
                  {line.customer_code || ""}
                </div>
              </td>

              {/* Customer Name */}
              <td className="p-1.5 min-w-[180px]">
                <div
                  className="h-8 flex items-center px-2 truncate"
                  title={line.customer_name}
                >
                  {line.customer_name}
                </div>
              </td>

              {/* Currency */}
              <td className="p-1.5 min-w-[130px]">
                <select
                  value={line.currency_id}
                  onChange={(event) =>
                    onChange(index, "currency_id", event.target.value)
                  }
                  className="w-full h-8 rounded border border-zinc-300 bg-zinc-50 px-2 text-xs outline-none focus:border-emerald-600"
                >
                  <option value="">{baseCurrencyCode}</option>

                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code}
                    </option>
                  ))}
                </select>
              </td>

              {/* Debit */}
              <td className="p-1.5 min-w-[120px]">
                <NumericTextInput
                  value={Number(line.debit)}
                  allowDecimals
                  decimalScale={2}
                  onChange={(value) => onChange(index, "debit", Number(value))}
                  className="w-full border p-1 rounded text-right"
                />
              </td>

              {/* Credit */}
              <td className="p-1.5 min-w-[120px]">
                <NumericTextInput
                  value={Number(line.credit)}
                  allowDecimals
                  decimalScale={2}
                  onChange={(value) => onChange(index, "credit", Number(value))}
                  className="w-full border p-1 rounded text-right"
                />
              </td>

              {/* Exchange Rate */}
              <td className="p-1.5 min-w-[120px]">
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

              {/* Amount LCY */}
              <td className="p-1.5 text-right font-mono font-medium min-w-[130px]">
                {formatLCY(calculateAmountLCY(line))}
              </td>

              {/* Action */}
              <td className="p-1.5 text-center min-w-[70px]">
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="text-zinc-400 hover:text-red-600 p-1 border border-zinc-300 rounded"
                  title="Remove"
                >
                  <Icon icon="tabler:x" className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}

          {/* Empty state */}
          {lines.length === 0 && (
            <tr>
              <td colSpan={12} className="p-8 text-center text-zinc-400">
                Select a customer to add opening balance lines.
              </td>
            </tr>
          )}
        </tbody>

        {/* Total */}
        <tfoot>
          <tr className="border-t border-zinc-300 bg-white">
            <td colSpan={10} className="p-2 text-right font-semibold">
              Total:
            </td>

            <td className="p-2 text-right font-mono font-semibold">
              {formatLCY(totalLCY)}
            </td>

            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
