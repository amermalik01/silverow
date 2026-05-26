// /app/components/sales/orders/SalesOrderLines.tsx
"use client";

import { useMemo, useState } from "react";

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
};

export default function SalesOrderLines({
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
        vat_percent: 0,

        original_amount: 0,
        discount_amount: 0,
        net_amount: 0,
        vat_amount: 0,
        gross_amount: 0,
      },
    ]);
  };

  /**
   * REMOVE LINE
   */
  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  /**
   * CALCULATION ENGINE
   */
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
      ...(line as SalesOrderLineUI),

      original_amount: original,
      discount_amount: discount,
      net_amount: net,
      vat_amount: tax,
      gross_amount: total,
    };
  };

  /**
   * UPDATE LINE
   */
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

  /**
   * CHANGE TYPE
   */
  const changeLineType = (
    index: number,
    type: "ITEM" | "GL_ACCOUNT" | "COMMENT",
  ) => {
    const updated = [...lines];

    updated[index] = {
      ...updated[index],
      line_type: type,

      item_id: undefined,
      gl_account_id: undefined,
      //   service_name: undefined,

      quantity: type === "COMMENT" ? 0 : 1,
      unit_price: 0,
    };

    setLines(updated);
  };

  /**
   * TOTALS
   */
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

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex justify-between">
        <h3 className="font-semibold text-lg">Sales Quote Lines</h3>

        {!isReadonly && (
          <button
            onClick={addLine}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Add Line
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="border rounded overflow-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <thead className="bg-gray-100  text-black text-left">
            <tr>
              <th className="px-1 py-2">Type</th>
              <th className="px-1 py-2">Item/GL/Service</th>
              <th className="px-1 py-2">Description</th>
              <th className="px-1 py-2">Qty</th>
              <th className="px-1 py-2">Unit Price</th>
              <th className="px-1 py-2">Discount</th>
              <th className="px-1 py-2">Tax %</th>
              <th className="px-1 py-2">Total</th>
              {!isReadonly && <th className="px-1 py-2">Action</th>}
            </tr>
          </thead>

          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t">
                {/* TYPE */}
                <td className="px-1 py-2">
                  <select
                    value={line.line_type || "ITEM"}
                    disabled={isReadonly}
                    onChange={(e) =>
                      changeLineType(
                        index,
                        e.target.value as "ITEM" | "GL_ACCOUNT" | "COMMENT",
                      )
                    }
                    className="border p-1"
                  >
                    <option value="ITEM">Item</option>
                    <option value="GL_ACCOUNT">GL</option>
                    {/* <option value="SERVICE">Service</option> */}
                    <option value="COMMENT">Comment</option>
                  </select>
                </td>

                {/* ITEM / GL / SERVICE */}
                <td className="px-1 py-2">
                  {line.line_type === "ITEM" && (
                    <button
                      onClick={() => setItemIndex(index)}
                      className="border px-2 py-1"
                    >
                      {line.item_code || "Select Item"}
                    </button>
                  )}

                  {line.line_type === "GL_ACCOUNT" && (
                    <button
                      onClick={() => setGlIndex(index)}
                      className="border px-2 py-1"
                    >
                      {line.account_code || "Select GL"}
                    </button>
                  )}

                  {/* {line.line_type === "SERVICE" && (
                    <input
                      value={line.service_name || ""}
                      onChange={(e) =>
                        updateLine(index, "service_name", e.target.value)
                      }
                      placeholder="Service name"
                      className="border p-1"
                    />
                  )} */}
                </td>

                {/* DESCRIPTION */}
                <td className="px-1 py-2">
                  <input
                    value={line.description || ""}
                    onChange={(e) =>
                      updateLine(index, "description", e.target.value)
                    }
                    className="border p-1 w-full"
                  />
                </td>

                {/* QTY */}
                <td className="px-1 py-2">
                  <input
                    type="number"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(index, "quantity", Number(e.target.value))
                    }
                    className="border p-1 w-20"
                  />
                </td>

                {/* PRICE */}
                <td className="px-1 py-2">
                  <input
                    type="number"
                    value={line.unit_price}
                    onChange={(e) =>
                      updateLine(index, "unit_price", Number(e.target.value))
                    }
                    className="border p-1 w-24"
                  />
                </td>

                {/* DISCOUNT */}
                <td className="px-1 py-2">
                  <input
                    type="number"
                    value={line.discount_value}
                    onChange={(e) =>
                      updateLine(
                        index,
                        "discount_value",
                        Number(e.target.value),
                      )
                    }
                    className="border p-1 w-20"
                  />
                </td>

                {/* TAX */}
                <td className="px-1 py-2">
                  <input
                    type="number"
                    value={line.vat_percent}
                    onChange={(e) =>
                      updateLine(index, "vat_percent", Number(e.target.value))
                    }
                    className="border p-1 w-20"
                  />
                </td>

                {/* TOTAL */}
                <td className="px-1 py-2">{Number(line.gross_amount || 0).toFixed(2)}</td>

                {/* ACTION */}
                {!isReadonly && (
                  <td className="px-1 py-2">
                    <button
                      onClick={() => removeLine(index)}
                      className="text-red-600"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
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
  );
}
