// app/components/sales/quotes/SalesQuoteLines.tsx
"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";

import { SalesQuoteLineUI, SalesQuoteLine2 } from "@/types/sales-quote";

import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";
import { Button } from "@/components/ui/button";

type Props = {
  lines: SalesQuoteLineUI[];
  setLines: React.Dispatch<React.SetStateAction<SalesQuoteLineUI[]>>;
  isReadonly?: boolean;
};

export default function SalesQuoteLines({
  lines,
  setLines,
  isReadonly = false,
}: Props) {
  /**
   * LOOKUPS
   */
  const [itemIndex, setItemIndex] = useState<number | null>(null);
  const [glIndex, setGlIndex] = useState<number | null>(null);

  /**
   * ADD LINE
   */

  const addLine = () => {
    setLines([
      ...lines,
      {
        line_type: "ITEM",
        quantity: 1,
        unit_price: 0,
        discount_type: "PERCENT",
        discount_value: 0,
        tax_percent: 0,

        original_amount: 0,
        discount_amount: 0,
        net_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        line_total: 0,
      },
    ]);
  };

  /**
   * REMOVE LINE
   */
  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const calculateLine = (line: Partial<SalesQuoteLineUI>): SalesQuoteLineUI => {
    const qty = Number(line.quantity || 0);
    const price = Number(line.unit_price || 0);
    const discValue = Number(line.discount_value || 0);
    const taxPer = Number(line.tax_percent || 0);

    const original = qty * price;

    // Calculate Discount
    const discountAmount =
      line.discount_type === "PERCENT"
        ? original * (discValue / 100)
        : discValue;

    const netAmount = original - discountAmount;

    // Calculate VAT
    const vatAmount = netAmount * (taxPer / 100);

    // Final Line Total
    const lineAmount = netAmount + vatAmount;

    return {
      ...line,
      quantity: qty,
      unit_price: price,
      discount_value: discValue,
      tax_percent: taxPer,
      discount_amount: Number(discountAmount.toFixed(2)),
      original_amount: Number(original.toFixed(2)),
      net_amount: Number(netAmount.toFixed(2)),
      tax_amount: Number(vatAmount.toFixed(2)), // UI uses tax_amount
      total_amount: Number(lineAmount.toFixed(2)), // UI uses total_amount
      line_total: Number(lineAmount.toFixed(2)), // Support for older code
    } as SalesQuoteLineUI;
  };

  /**
   * UPDATE LINE
   */
  const updateLine = <K extends keyof SalesQuoteLineUI>(
    index: number,
    field: K,
    value: SalesQuoteLineUI[K],
  ) => {
    const updated = [...lines];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    updated[index] = calculateLine(updated[index]);

    setLines(updated);
  };

  /**
   * CHANGE TYPE
   */
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
      tax_percent: 0,
      description: "",
    };
    setLines(updated);

    // updated[index] = {
    //   ...updated[index],
    //   line_type: type,

    //   item_id: undefined,
    //   gl_account_id: undefined,
    //   //   service_name: undefined,

    //   quantity: type === "COMMENT" ? 0 : 1,
    //   unit_price: 0,
    // };
  };

  /**
   * TOTALS
   */

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => {
        acc.total += Number(l.total_amount || 0);
        return acc;
      },
      { total: 0 },
    );
  }, [lines]);
  // const totals = useMemo(() => {
  //   return lines.reduce(
  //     (acc, l) => {
  //       acc.original += Number(l.original_amount || 0);
  //       acc.discount += Number(l.discount_amount || 0);
  //       acc.net += Number(l.net_amount || 0);
  //       acc.tax += Number(l.tax_amount || 0);
  //       acc.total += Number(l.total_amount || 0);
  //       return acc;
  //     },
  //     {
  //       original: 0,
  //       discount: 0,
  //       net: 0,
  //       tax: 0,
  //       total: 0,
  //     },
  //   );
  // }, [lines]);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-md opacity-80">
          Sales Quote Lines Ledger
        </h3>
        {!isReadonly && (
          <Button
            type="button"
            onClick={addLine}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Line
          </Button>
        )}
      </div>

      <div className="border rounded overflow-auto bg-white dark:bg-slate-900">
        <table className="w-full text-xs min-w-[1100px]">
          <thead className="bg-gray-50 dark:bg-slate-800 text-black dark:text-white text-left text-xs capitalize font-semibold">
            <tr>
              <th className="p-2 w-28">Type</th>
              <th className="p-2 w-48">Item / GL Link</th>
              <th className="p-2">Description</th>
              <th className="p-2 w-20">Qty</th>
              <th className="p-2 w-28">Unit Price</th>
              <th className="p-2 w-24">Discount</th>
              <th className="p-2 w-20">Tax %</th>
              <th className="p-2 w-28 text-right">Total</th>
              {!isReadonly && <th className="p-2 w-20 text-center">Action</th>}
            </tr>
          </thead>

          <tbody>
            {lines.map((line, index) => (
              <tr
                key={index}
                className="border-t border-gray-100 dark:border-slate-800"
              >
                {/* TYPE */}
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
                    className="border rounded p-1 w-full dark:bg-slate-900"
                  >
                    <option value="ITEM">Item</option>
                    <option value="GL_ACCOUNT">GL</option>
                    {/* <option value="COMMENT">Comment</option> */}
                  </select>
                </td>

                {/* DYNAMIC ITEM / GL SELECT BUTTONS */}
                <td className="p-2">
                  {line.line_type === "ITEM" && (
                    <button
                      type="button"
                      disabled={isReadonly}
                      onClick={() => setItemIndex(index)}
                      className="border rounded px-2 py-1 text-left w-full bg-gray-50 hover:bg-gray-100 truncate dark:bg-slate-800"
                    >
                      {/* Fallback to description if the item code join is absent */}
                      {line.item_code ||
                        line.description ||
                        "Select Product/Item"}
                    </button>
                  )}

                  {line.line_type === "GL_ACCOUNT" && (
                    <button
                      type="button"
                      disabled={isReadonly}
                      onClick={() => setGlIndex(index)}
                      className="border rounded px-2 py-1 text-left w-full bg-gray-50 hover:bg-gray-100 truncate dark:bg-slate-800"
                    >
                      {line.account_code ||
                        line.description ||
                        "Select GL Account"}
                    </button>
                  )}

                  {line.line_type === "COMMENT" && (
                    <span className="text-xs italic opacity-40 p-1 block">
                      Plain Text Mode
                    </span>
                  )}
                </td>

                {/* DESCRIPTION */}
                <td className="p-2">
                  <input
                    value={line.description || ""}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateLine(index, "description", e.target.value)
                    }
                    className="border rounded p-1 w-full dark:bg-slate-900"
                  />
                </td>

                {/* QUANTITY */}
                <td className="p-2">
                  <input
                    type="number"
                    value={line.quantity ?? 0}
                    disabled={isReadonly || line.line_type === "COMMENT"}
                    onChange={(e) =>
                      updateLine(index, "quantity", Number(e.target.value))
                    }
                    className="border rounded p-1 w-full text-center dark:bg-slate-900"
                  />
                </td>

                {/* PRICE */}
                <td className="p-2">
                  <input
                    type="number"
                    value={line.unit_price ?? 0}
                    disabled={isReadonly || line.line_type === "COMMENT"}
                    onChange={(e) =>
                      updateLine(index, "unit_price", Number(e.target.value))
                    }
                    className="border rounded p-1 w-full text-right dark:bg-slate-900"
                  />
                </td>

                {/* DISCOUNT */}
                <td className="p-2">
                  <input
                    type="number"
                    value={line.discount_value ?? 0}
                    disabled={isReadonly || line.line_type === "COMMENT"}
                    onChange={(e) =>
                      updateLine(
                        index,
                        "discount_value",
                        Number(e.target.value),
                      )
                    }
                    className="border rounded p-1 w-full text-right dark:bg-slate-900"
                  />
                </td>

                {/* TAX RATE */}
                <td className="p-2">
                  <input
                    type="number"
                    value={line.tax_percent ?? 0}
                    disabled={isReadonly || line.line_type === "COMMENT"}
                    onChange={(e) =>
                      updateLine(index, "tax_percent", Number(e.target.value))
                    }
                    className="border rounded p-1 w-full text-center dark:bg-slate-900"
                  />
                </td>

                {/* LINE TOTAL */}
                <td className="p-2 text-right font-mono font-medium">
                  {Number(line.total_amount || 0).toFixed(2)}
                </td>

                {/* ACTION CONTEXT */}
                {!isReadonly && (
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      // className="text-red-500 hover:text-red-700 text-xs font-semibold"
                      className="text-red-600 hover:text-red-800 p-1 rounded font-medium bg-slate-100  dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                    >
                      <Icon icon="lucide:x" className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>

          <tfoot className="bg-gray-50 dark:bg-slate-800 font-semibold text-black dark:text-white">
            <tr>
              <td
                colSpan={7}
                className="text-right p-3 text-xs capitalize opacity-70"
              >
                Document Summary Total
              </td>
              <td className="p-3 text-right font-mono text-base">
                {totals.total.toFixed(2)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

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
  );
}

