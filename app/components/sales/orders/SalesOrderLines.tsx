// /app/components/sales/orders/SalesOrderLines.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { SalesOrderLineUI, SalesOrderLine } from "@/types/sales-order";

import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

type Props = {
  lines: SalesOrderLineUI[];
  setLines: React.Dispatch<React.SetStateAction<SalesOrderLineUI[]>>;
  isReadonly?: boolean;
  onTotalsChange?: (totals: {
    subtotal: number;
    tax: number;
    total: number;
  }) => void;
};

export default function SalesOrderLines({
  lines,
  setLines,
  isReadonly = false,
  onTotalsChange,
}: Props) {
  const [itemIndex, setItemIndex] = useState<number | null>(null);
  const [glIndex, setGlIndex] = useState<number | null>(null);

  const addLine = () => {
    setLines([
      ...lines,
      {
        line_type: "ITEM",
        quantity: 1,
        unit_price: 0,
        discount_type: "PERCENT",
        discount_value: 0,
        vat_percent: 0,

        original_amount: 0,
        discount_amount: 0,
        net_amount: 0,
        vat_amount: 0,
        gross_amount: 0,
      },
    ]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const calculateLine = (line: Partial<SalesOrderLineUI>): SalesOrderLine => {
    const qty = Number(line.quantity || 0);
    const price = Number(line.unit_price || 0);

    const original = qty * price;

    let discount = 0;

    if (line.discount_type === "PERCENT") {
      discount = original * (Number(line.discount_value || 0) / 100);
    } else {
      discount = Number(line.discount_value || 0);
    }

    const net = original - discount;
    const tax = net * (Number(line.vat_percent || 0) / 100);
    const total = net + tax;

    return {
      ...line,
      original_amount: original,
      discount_amount: discount,
      net_amount: net,
      vat_amount: tax,
      gross_amount: total,
      line_total: total,
    } as SalesOrderLineUI;
  };

  const updateLine = <K extends keyof SalesOrderLineUI>(
    index: number,
    field: K,
    value: SalesOrderLineUI[K],
  ) => {
    const updated = [...lines];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    updated[index] = calculateLine(updated[index]);

    setLines(updated);
  };

  const changeLineType = (
    index: number,
    type: "ITEM" | "GL_ACCOUNT" | "COMMENT",
  ) => {
    const updated = [...lines];

    updated[index] = {
      line_type: type,
      quantity: type === "COMMENT" ? 0 : 1,
      unit_price: 0,
      discount_type: "PERCENT",
      discount_value: 0,
      vat_percent: 0,
      original_amount: 0,
      discount_amount: 0,
      net_amount: 0,
      vat_amount: 0,
      gross_amount: 0,
    };
    setLines(updated);

    // updated[index] = {
    //   ...updated[index],
    //   line_type: type,

    //   item_id: undefined,
    //   gl_account_id: undefined,

    //   quantity: type === "COMMENT" ? 0 : 1,
    //   unit_price: 0,
    // };
  };

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => {
        acc.original += Number(l.original_amount || 0);
        acc.discount += Number(l.discount_amount || 0);
        acc.net += Number(l.net_amount || 0);
        acc.tax += Number(l.vat_amount || 0);
        acc.total += Number(l.gross_amount || 0);
        return acc;
      },
      {
        original: 0,
        discount: 0,
        net: 0,
        tax: 0,
        total: 0,
      },
    );
  }, [lines]);

  // Push total updates upwards to main state form hook safely
  useEffect(() => {
    if (onTotalsChange) {
      onTotalsChange({
        subtotal: totals.net,
        tax: totals.tax,
        total: totals.total,
      });
    }
  }, [totals, onTotalsChange]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-base dark:text-white">
          Sales Order Lines
        </h3>
        {!isReadonly && (
          <button
            type="button"
            onClick={addLine}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Add Line
          </button>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-gray-50 dark:bg-slate-800 text-black dark:text-white text-left border-b">
              <tr>
                <th className="p-3 w-32">Type</th>
                <th className="p-3 w-48">Item / GL Account</th>
                <th className="p-3">Description</th>
                <th className="p-3 w-24 text-right">Qty</th>
                <th className="p-3 w-32 text-right">Unit Price</th>
                <th className="p-3 w-28 text-right">Discount</th>
                <th className="p-3 w-24 text-right">Tax %</th>
                <th className="p-3 w-32 text-right">Total</th>
                {!isReadonly && (
                  <th className="p-3 w-20 text-center">Action</th>
                )}
              </tr>
            </thead>

            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-8 text-center text-gray-400 dark:text-gray-500"
                  >
                    No lines added yet. Click Add Line to get started.
                  </td>
                </tr>
              ) : (
                lines.map((line, index) => (
                  <tr
                    key={index}
                    className="border-t border-gray-100 dark:border-slate-800"
                  >
                    <td className="p-2">
                      <select
                        value={line.line_type || "ITEM"}
                        disabled={isReadonly}
                        onChange={(e) =>
                          changeLineType(
                            index,
                            e.target.value as "ITEM" | "GL_ACCOUNT" | "COMMENT",
                          )
                        }
                        className="border dark:border-slate-700 rounded p-1.5 w-full text-sm bg-transparent dark:bg-slate-800 text-black dark:text-white"
                      >
                        <option value="ITEM">Item</option>
                        <option value="GL_ACCOUNT">GL Account</option>
                        <option value="COMMENT">Comment</option>
                      </select>
                    </td>

                    <td className="p-2">
                      {line.line_type === "ITEM" && (
                        <button
                          type="button"
                          onClick={() => !isReadonly && setItemIndex(index)}
                          disabled={isReadonly}
                          className="border dark:border-slate-700 rounded px-3 py-1.5 w-full text-left bg-gray-50 dark:bg-slate-800 text-xs truncate"
                        >
                          {line.item_code
                            ? `📦 ${line.item_code}`
                            : "🔍 Select Item"}
                        </button>
                      )}

                      {line.line_type === "GL_ACCOUNT" && (
                        <button
                          type="button"
                          onClick={() => !isReadonly && setGlIndex(index)}
                          disabled={isReadonly}
                          className="border dark:border-slate-700 rounded px-3 py-1.5 w-full text-left bg-gray-50 dark:bg-slate-800 text-xs truncate"
                        >
                          {line.account_code
                            ? `💳 ${line.account_code}`
                            : "🔍 Select GL"}
                        </button>
                      )}

                      {line.line_type === "COMMENT" && (
                        <span className="text-xs text-gray-400 p-2 block">
                          N/A
                        </span>
                      )}
                    </td>

                    <td className="p-2">
                      <input
                        value={line.description || ""}
                        disabled={isReadonly}
                        onChange={(e) =>
                          updateLine(index, "description", e.target.value)
                        }
                        placeholder={
                          line.line_type === "COMMENT"
                            ? "Enter narrative notes..."
                            : "Description"
                        }
                        className="border dark:border-slate-700 rounded p-1.5 w-full text-sm bg-transparent dark:bg-slate-800 text-black dark:text-white"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isReadonly || line.line_type === "COMMENT"}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "quantity",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="border dark:border-slate-700 rounded p-1.5 w-full text-sm text-right bg-transparent disabled:opacity-40"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isReadonly || line.line_type === "COMMENT"}
                        value={line.unit_price}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "unit_price",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="border dark:border-slate-700 rounded p-1.5 w-full text-sm text-right bg-transparent disabled:opacity-40"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isReadonly || line.line_type === "COMMENT"}
                        value={line.discount_value}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "discount_value",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="border dark:border-slate-700 rounded p-1.5 w-full text-sm text-right bg-transparent disabled:opacity-40"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isReadonly || line.line_type === "COMMENT"}
                        value={line.vat_percent}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "vat_percent",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="border dark:border-slate-700 rounded p-1.5 w-full text-sm text-right bg-transparent disabled:opacity-40"
                      />
                    </td>

                    <td className="p-3 text-right font-medium dark:text-white">
                      {Number(line.gross_amount || 0).toFixed(2)}
                    </td>

                    {!isReadonly && (
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="text-red-500 hover:text-red-700 font-medium text-xs transition"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>

            {/* TOTALS */}
            <tfoot className="bg-gray-50 font-semibold text-black">
              <tr>
                <td colSpan={7} className="text-right p-2">
                  Totals
                </td>
                <td className="px-1 py-2">{totals.total.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ITEM MODAL */}
        <ItemLookupModal
          open={itemIndex !== null}
          onClose={() => setItemIndex(null)}
          onSelect={(item: ItemLookupRecord) => {
            if (itemIndex === null) return;

            const updated = [...lines];

            updated[itemIndex] = calculateLine({
              ...updated[itemIndex],
              line_type: "ITEM",
              item_id: item.id,
              item_code: item.item_code,
              description: item.name,
              unit_price: Number(item.standard_sales_price || 0),
            });

            setLines(updated);
            setItemIndex(null);
          }}
        />

        {/* GL MODAL */}
        <GLAccountLookupModal
          open={glIndex !== null}
          onClose={() => setGlIndex(null)}
          onSelect={(gl: GLAccountLookupRecord) => {
            if (glIndex === null) return;

            const updated = [...lines];

            updated[glIndex] = calculateLine({
              ...updated[glIndex],
              line_type: "GL_ACCOUNT",
              gl_account_id: gl.id,
              account_code: gl.code,
              description: gl.name,
            });

            setLines(updated);
            setGlIndex(null);
          }}
        />
      </div>
    </div>
  );
}
