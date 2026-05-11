// app/components/purchases/purchase-orders/PurchaseOrderLines.tsx

"use client";

import { useMemo, useState } from "react";

import { PurchaseOrderLine } from "@/types/purchase-order";

import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

import WarehouseLookupModal, {
  WarehouseLookupRecord,
} from "@/app/components/shared/modals/WarehouseLookupModal";

type Props = {
  lines: PurchaseOrderLine[];

  setLines: React.Dispatch<React.SetStateAction<PurchaseOrderLine[]>>;

  isReadonly?: boolean;
};

export default function PurchaseOrderLines({
  lines,
  setLines,
  isReadonly = false,
}: Props) {
  /**
   * =====================================================
   * LOOKUP INDEXES
   * =====================================================
   */

  const [itemIndex, setItemIndex] = useState<number | null>(null);

  const [glIndex, setGlIndex] = useState<number | null>(null);

  const [warehouseIndex, setWarehouseIndex] = useState<number | null>(null);

  /**
   * =====================================================
   * ADD LINE
   * =====================================================
   */

  const addLine = () => {
    setLines([
      ...lines,
      {
        line_type: "ITEM",

        quantity: 1,

        unit_cost: 0,

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
   * =====================================================
   * REMOVE LINE
   * =====================================================
   */

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  /**
   * =====================================================
   * CALCULATE LINE
   * =====================================================
   */

  const calculateLine = (
    line: Partial<PurchaseOrderLine>,
  ): PurchaseOrderLine => {
    const qty = Number(line.quantity || 0);

    const price = Number(line.unit_cost || 0);

    const original = qty * price;

    let discountAmount = 0;

    if (line.discount_type === "PERCENT") {
      discountAmount = original * (Number(line.discount_value || 0) / 100);
    } else {
      discountAmount = Number(line.discount_value || 0);
    }

    const net = original - discountAmount;

    const vat = net * (Number(line.vat_percent || 0) / 100);

    const gross = net + vat;

    return {
      ...(line as PurchaseOrderLine),

      original_amount: original,

      discount_amount: discountAmount,

      net_amount: net,

      vat_amount: vat,

      gross_amount: gross,
    };
  };

  /**
   * =====================================================
   * UPDATE LINE
   * =====================================================
   */

  const updateLine = <K extends keyof PurchaseOrderLine>(
    index: number,
    field: K,
    value: PurchaseOrderLine[K],
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
   * =====================================================
   * CHANGE LINE TYPE
   * =====================================================
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
      item_code: undefined,
      item_name: undefined,

      gl_account_id: undefined,
      account_code: undefined,
      account_name: undefined,

      warehouse_id: undefined,
      warehouse_code: undefined,
      warehouse_name: undefined,
    };

    setLines(updated);
  };

  /**
   * =====================================================
   * TOTALS
   * =====================================================
   */

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        acc.original += Number(line.original_amount || 0);

        acc.discount += Number(line.discount_amount || 0);

        acc.net += Number(line.net_amount || 0);

        acc.vat += Number(line.vat_amount || 0);

        acc.gross += Number(line.gross_amount || 0);

        return acc;
      },
      {
        original: 0,
        discount: 0,
        net: 0,
        vat: 0,
        gross: 0,
      },
    );
  }, [lines]);

  const handleDiscountTypeChange = (index: number, value: string) => {
    updateLine(index, "discount_type", value as "PERCENT" | "FIXED");
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Purchase Order Lines</h3>

        {!isReadonly && (
          <button
            type="button"
            onClick={addLine}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Line
          </button>
        )}
      </div>

      {/* TABLE */}

      <div className="overflow-auto border rounded-xl">
        <table className="w-full text-sm min-w-[1700px]">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="p-2 text-left">Type</th>

              <th className="p-2 text-left">No.</th>

              <th className="p-2 text-left">Description</th>

              <th className="p-2 text-right">Qty</th>

              <th className="p-2 text-left">UOM</th>

              <th className="p-2 text-left">Warehouse</th>

              <th className="p-2 text-right">Unit Cost</th>

              <th className="p-2 text-left">Disc Type</th>

              <th className="p-2 text-right">Discount</th>

              <th className="p-2 text-right">VAT %</th>

              <th className="p-2 text-right">Original</th>

              <th className="p-2 text-right">Discount</th>

              <th className="p-2 text-right">Net</th>

              <th className="p-2 text-right">VAT</th>

              <th className="p-2 text-right">Gross</th>

              {!isReadonly && <th className="p-2 text-center">Action</th>}
            </tr>
          </thead>

          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={16} className="text-center p-8 text-gray-500 ">
                  No lines added
                </td>
              </tr>
            )}

            {lines.map((line, index) => (
              <tr key={index} className="border-t align-top">
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
                    className="border rounded p-2 w-[120px] text-black bg-gray-50"
                  >
                    <option value="ITEM">Item</option>

                    <option value="GL_ACCOUNT">G/L</option>

                    <option value="COMMENT">Comment</option>
                  </select>
                </td>

                {/* ITEM / GL */}

                <td className="p-2">
                  {line.line_type === "ITEM" && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        disabled={isReadonly}
                        onClick={() => setItemIndex(index)}
                        className="border rounded px-3 py-2 bg-white  text-black hover:bg-gray-50 w-[140px] text-left"
                      >
                        {line.item_code || "Select Item"}
                      </button>

                      {line.item_name && (
                        <div className="text-xs   text-black">
                          {line.item_name}
                        </div>
                      )}
                    </div>
                  )}

                  {line.line_type === "GL_ACCOUNT" && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        disabled={isReadonly}
                        onClick={() => setGlIndex(index)}
                        className="border rounded px-3 py-2 bg-white  text-black hover:bg-gray-50 w-[140px] text-left"
                      >
                        {line.account_code || "Select GL"}
                      </button>

                      {line.account_name && (
                        <div className="text-xs  text-black">
                          {line.account_name}
                        </div>
                      )}
                    </div>
                  )}
                </td>

                {/* DESCRIPTION */}

                <td className="p-2">
                  <textarea
                    value={line.description || ""}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateLine(index, "description", e.target.value)
                    }
                    className="border rounded p-2 w-[260px]"
                    rows={2}
                  />
                </td>

                {/* QTY */}

                <td className="p-2">
                  <input
                    type="number"
                    value={line.quantity || 0}
                    disabled={isReadonly || line.line_type === "COMMENT"}
                    onChange={(e) =>
                      updateLine(index, "quantity", Number(e.target.value))
                    }
                    className="border rounded p-2 w-[90px] text-right"
                  />
                </td>

                {/* UOM */}

                <td className="p-2">
                  <div className="border rounded p-2 min-w-[80px] text-black bg-gray-50">
                    {line.uom_name || "-"}
                  </div>
                </td>

                {/* WAREHOUSE */}

                <td className="p-2">
                  {line.line_type === "ITEM" && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        disabled={isReadonly}
                        onClick={() => setWarehouseIndex(index)}
                        className="border rounded px-3 py-2 bg-white hover:bg-gray-50 w-[160px] text-left"
                      >
                        {line.warehouse_code || "Select Warehouse"}
                      </button>

                      {line.warehouse_name && (
                        <div className="text-xs text-gray-500 text-black">
                          {line.warehouse_name}
                        </div>
                      )}
                    </div>
                  )}
                </td>

                {/* UNIT COST */}

                <td className="p-2">
                  <input
                    type="number"
                    value={line.unit_cost || 0}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateLine(index, "unit_cost", Number(e.target.value))
                    }
                    className="border rounded p-2 w-[110px] text-right"
                  />
                </td>

                {/* DISC TYPE */}

                <td className="p-2">
                  <select
                    value={line.discount_type || "PERCENT"}
                    disabled={isReadonly}
                    onChange={(e) =>
                      handleDiscountTypeChange(index, e.target.value)
                    }
                    className="border rounded p-2 w-[100px] text-black bg-gray-50"
                  >
                    <option value="PERCENT">%</option>

                    <option value="FIXED">Fixed</option>
                  </select>
                </td>

                {/* DISCOUNT */}

                <td className="p-2">
                  <input
                    type="number"
                    value={line.discount_value || 0}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateLine(
                        index,
                        "discount_value",
                        Number(e.target.value),
                      )
                    }
                    className="border rounded p-2 w-[100px] text-right "
                  />
                </td>

                {/* VAT */}

                <td className="p-2">
                  <input
                    type="number"
                    value={line.vat_percent || 0}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateLine(index, "vat_percent", Number(e.target.value))
                    }
                    className="border rounded p-2 w-[90px] text-right"
                  />
                </td>

                {/* ORIGINAL */}

                <td className="p-2 text-right">
                  {Number(line.original_amount || 0).toFixed(2)}
                </td>

                {/* DISCOUNT */}

                <td className="p-2 text-right">
                  {Number(line.discount_amount || 0).toFixed(2)}
                </td>

                {/* NET */}

                <td className="p-2 text-right font-medium">
                  {Number(line.net_amount || 0).toFixed(2)}
                </td>

                {/* VAT */}

                <td className="p-2 text-right">
                  {Number(line.vat_amount || 0).toFixed(2)}
                </td>

                {/* GROSS */}

                <td className="p-2 text-right font-semibold">
                  {Number(line.gross_amount || 0).toFixed(2)}
                </td>

                {/* ACTION */}

                {!isReadonly && (
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>

          {/* FOOTER */}

          <tfoot className="bg-gray-50 border-t font-semibold text-black">
            <tr>
              <td colSpan={10} className="p-3 text-right">
                Totals
              </td>

              <td className="p-3 text-right">{totals.original.toFixed(2)}</td>

              <td className="p-3 text-right">{totals.discount.toFixed(2)}</td>

              <td className="p-3 text-right">{totals.net.toFixed(2)}</td>

              <td className="p-3 text-right">{totals.vat.toFixed(2)}</td>

              <td className="p-3 text-right">{totals.gross.toFixed(2)}</td>

              {!isReadonly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* =====================================================
          ITEM LOOKUP
      ===================================================== */}

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

            item_name: item.name,

            description: item.description || item.name,

            unit_cost: Number(item.standard_cost || 0),

            uom_id: item.base_uom_id,

            purchase_gl_id: item.purchase_gl_id,

            sales_gl_id: item.sales_gl_id,

            inventory_gl_id: item.inventory_gl_id,
          });

          setLines(updated);

          setItemIndex(null);
        }}
      />

      {/* =====================================================
          GL ACCOUNT LOOKUP
      ===================================================== */}

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

            account_name: gl.name,

            description: gl.name,
          });

          setLines(updated);

          setGlIndex(null);
        }}
      />

      {/* =====================================================
          WAREHOUSE LOOKUP
      ===================================================== */}

      <WarehouseLookupModal
        open={warehouseIndex !== null}
        onClose={() => setWarehouseIndex(null)}
        onSelect={(warehouse: WarehouseLookupRecord) => {
          if (warehouseIndex === null) return;

          const updated = [...lines];

          updated[warehouseIndex] = {
            ...updated[warehouseIndex],

            warehouse_id: warehouse.id,

            warehouse_code: warehouse.code,

            warehouse_name: warehouse.name,
          };

          setLines(updated);

          setWarehouseIndex(null);
        }}
      />
    </div>
  );
}

/* "use client";

import { useState } from "react";

import { PurchaseOrderLine } from "@/types/purchase-order";
import ItemLookupModal from "../../shared/modals/ItemLookupModal";
import GLAccountLookupModal from "../../shared/modals/GLAccountLookupModal";
import WarehouseLookupModal from "../../shared/modals/WarehouseLookupModal";
type Props = {
  lines: PurchaseOrderLine[];

  setLines: React.Dispatch<React.SetStateAction<PurchaseOrderLine[]>>;

  isReadonly?: boolean;
};

export default function PurchaseOrderLines({
  lines,
  setLines,
  isReadonly = false,
}: Props) {
  const [itemIndex, setItemIndex] = useState<number | null>(null);

  const [glIndex, setGlIndex] = useState<number | null>(null);

  const [warehouseIndex, setWarehouseIndex] = useState<number | null>(null);


  const addLine = () => {
    setLines([
      ...lines,
      {
        line_type: "ITEM",

        quantity: 1,

        unit_cost: 0,

        discount_type: "PERCENT",

        discount_value: 0,

        vat_percent: 0,
      },
    ]);
  };


  const updateLine = (
    index: number,
    field: keyof PurchaseOrderLine,
    value: any,
  ) => {
    const updated = [...lines];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    calculateLine(updated[index]);

    setLines(updated);
  };


  const calculateLine = (line: PurchaseOrderLine) => {
    const qty = Number(line.quantity || 0);

    const price = Number(line.unit_cost || 0);

    const original = qty * price;

    let discountAmount = 0;

    if (line.discount_type === "PERCENT") {
      discountAmount = original * (Number(line.discount_value || 0) / 100);
    } else {
      discountAmount = Number(line.discount_value || 0);
    }

    const net = original - discountAmount;

    const vat = net * (Number(line.vat_percent || 0) / 100);

    const gross = net + vat;

    line.original_amount = original;

    line.discount_amount = discountAmount;

    line.net_amount = net;

    line.vat_amount = vat;

    line.gross_amount = gross;
  };

  return (
    <div className="space-y-4">
      {!isReadonly && (
        <button
          type="button"
          onClick={addLine}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Line
        </button>
      )}

      <div className="overflow-auto">
        <table className="w-full border text-sm">
          <thead>
            <tr>
              <th>Type</th>

              <th>No.</th>

              <th>Description</th>

              <th>Qty</th>

              <th>Warehouse</th>

              <th>Unit Cost</th>

              <th>Disc Type</th>

              <th>Discount</th>

              <th>VAT %</th>

              <th>Original</th>

              <th>Discount</th>

              <th>Net</th>

              <th>VAT</th>

              <th>Gross</th>

              <th></th>
            </tr>
          </thead>

          <tbody>
            {lines.map((line, index) => (
              <tr key={index}>
   
                <td>
                  <select
                    value={line.line_type}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateLine(index, "line_type", e.target.value)
                    }
                    className="border p-2"
                  >
                    <option value="ITEM">Item</option>

                    <option value="GL_ACCOUNT">GL</option>

                    <option value="COMMENT">Comment</option>
                  </select>
                </td>

                <td>
                  {line.line_type === "ITEM" && (
                    <button
                      type="button"
                      onClick={() => setItemIndex(index)}
                      className="border px-2 py-1 rounded"
                    >
                      {line.item_code || "Select Item"}
                    </button>
                  )}

                  {line.line_type === "GL_ACCOUNT" && (
                    <button
                      type="button"
                      onClick={() => setGlIndex(index)}
                      className="border px-2 py-1 rounded"
                    >
                      {line.account_code || "Select GL"}
                    </button>
                  )}
                </td>


                <td>
                  <input
                    value={line.description || ""}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateLine(index, "description", e.target.value)
                    }
                    className="border p-2 w-64"
                  />
                </td>

      
                <td>
                  <input
                    type="number"
                    value={line.quantity}
                    disabled={isReadonly || line.line_type === "COMMENT"}
                    onChange={(e) =>
                      updateLine(index, "quantity", Number(e.target.value))
                    }
                    className="border p-2 w-20"
                  />
                </td>


                <td>
                  <button
                    type="button"
                    onClick={() => setWarehouseIndex(index)}
                    className="border px-2 py-1 rounded"
                  >
                    Select
                  </button>
                </td>

                <td>
                  <input
                    type="number"
                    value={line.unit_cost}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateLine(index, "unit_cost", Number(e.target.value))
                    }
                    className="border p-2 w-24"
                  />
                </td>


                <td>
                  <select
                    value={line.discount_type || "PERCENT"}
                    onChange={(e) =>
                      updateLine(index, "discount_type", e.target.value)
                    }
                    className="border p-2"
                  >
                    <option value="PERCENT">%</option>

                    <option value="FIXED">Fixed</option>
                  </select>
                </td>

                <td>
                  <input
                    type="number"
                    value={line.discount_value || 0}
                    onChange={(e) =>
                      updateLine(
                        index,
                        "discount_value",
                        Number(e.target.value),
                      )
                    }
                    className="border p-2 w-20"
                  />
                </td>


                <td>
                  <input
                    type="number"
                    value={line.vat_percent || 0}
                    onChange={(e) =>
                      updateLine(index, "vat_percent", Number(e.target.value))
                    }
                    className="border p-2 w-20"
                  />
                </td>

                <td>{Number(line.original_amount || 0).toFixed(2)}</td>

                <td>{Number(line.discount_amount || 0).toFixed(2)}</td>

                <td>{Number(line.net_amount || 0).toFixed(2)}</td>

                <td>{Number(line.vat_amount || 0).toFixed(2)}</td>

                <td>{Number(line.gross_amount || 0).toFixed(2)}</td>

                <td>
                  <button
                    type="button"
                    onClick={() =>
                      setLines(lines.filter((_, i) => i !== index))
                    }
                    className="text-red-600"
                  >
                    X
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <ItemLookupModal
        open={itemIndex !== null}
        onClose={() => setItemIndex(null)}
        onSelect={(item) => {
          if (itemIndex === null) return;

          updateLine(itemIndex, "item_id", item.id);

          updateLine(itemIndex, "item_code", item.item_code);

          updateLine(itemIndex, "description", item.name);

          updateLine(itemIndex, "unit_cost", item.standard_cost || 0);
        }}
      />


      <GLAccountLookupModal
        open={glIndex !== null}
        onClose={() => setGlIndex(null)}
        onSelect={(gl) => {
          if (glIndex === null) return;

          updateLine(glIndex, "gl_account_id", gl.id);

          updateLine(glIndex, "account_code", gl.code);

          updateLine(glIndex, "description", gl.name);
        }}
      />


      <WarehouseLookupModal
        open={warehouseIndex !== null}
        onClose={() => setWarehouseIndex(null)}
        onSelect={(warehouse) => {
          if (warehouseIndex === null) return;

          updateLine(warehouseIndex, "warehouse_id", warehouse.id);
        }}
      />
    </div>
  );
}
 */
