// app/components/purchases/debit-notes/DebitNoteLines.tsx

"use client";

import { useMemo, useState } from "react";
import { DebitNoteLine } from "@/types/debit-note";

import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

import WarehouseLookupModal, {
  WarehouseLookupRecord,
} from "@/app/components/shared/modals/WarehouseLookupModal";

import StockAllocationModal, {
  StockAllocationRecord,
} from "../../shared/modals/StockAllocationModal";

export type DebitNoteLineUI = DebitNoteLine & {
  item_code?: string;
  item_name?: string;
  account_code?: string;
  account_name?: string;
  warehouse_code?: string;
  warehouse_name?: string;
  uom_name?: string;
  reserved_quantity?: number;
  available_stock?: number;
  is_allocated?: boolean;
  allocations?: StockAllocationRecord[];
};

type Props = {
  lines: DebitNoteLineUI[];
  setLines: React.Dispatch<React.SetStateAction<DebitNoteLineUI[]>>;
  isReadonly?: boolean;
};

export default function DebitNoteLines({
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

  // Allocation Modal state wrappers using index keys
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [activeAllocationRowKey, setActiveAllocationRowKey] = useState<
    string | null
  >(null);

  // Derive the active line component via parsed row-index safely
  const activeAllocationLine = useMemo(() => {
    if (activeAllocationRowKey === null) return null;
    const idx = parseInt(activeAllocationRowKey, 10);
    return lines[idx] || null;
  }, [activeAllocationRowKey, lines]);

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
  const calculateLine = (line: Partial<DebitNoteLineUI>): DebitNoteLine => {
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
      ...(line as DebitNoteLineUI),
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
  const updateLine = <K extends keyof DebitNoteLineUI>(
    index: number,
    field: K,
    value: DebitNoteLineUI[K],
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
      allocations: undefined,
      is_allocated: false,
    };

    setLines(updated);
  };

  /**
   * =====================================================
   * ALLOCATION SAVE HANDLER
   * =====================================================
   */
  const handleSaveAllocations = (allocationsData: StockAllocationRecord[]) => {
    if (activeAllocationRowKey === null) return;
    const targetIdx = parseInt(activeAllocationRowKey, 10);

    setLines((prev) =>
      prev.map((line, index) => {
        if (index !== targetIdx) return line;

        const totalAllocated = allocationsData.reduce(
          (sum, a) => sum + a.quantity,
          0,
        );

        return {
          ...line,
          allocations: allocationsData,
          is_allocated: totalAllocated === (line.quantity || 0),
        };
      }),
    );

    setIsAllocationModalOpen(false);
    setActiveAllocationRowKey(null);
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Debit Note Lines</h3>

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

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-slate-600 dark:text-slate-400">
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

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {lines.length === 0 && (
              <tr>
                <td colSpan={16} className="text-center p-8 text-gray-500 ">
                  No lines added
                </td>
              </tr>
            )}

            {lines.map((line, index) => (
              <tr
                key={index}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
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
                    className="border rounded p-2 w-[120px] bg-gray-50 text-black"
                  >
                    <option value="ITEM">Item</option>
                    <option value="GL_ACCOUNT">G/L</option>
                    <option value="COMMENT">Comment</option>
                  </select>
                </td>

                {/* ITEM / GL LOOKUP */}
                <td className="p-2">
                  {line.line_type === "ITEM" && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        disabled={isReadonly}
                        onClick={() => setItemIndex(index)}
                        className="border rounded px-3 py-2 bg-white text-black hover:bg-gray-50 w-[140px] text-left"
                      >
                        {line.item_code || "Select Item"}
                      </button>
                      {line.item_name && (
                        <div className="text-xs text-gray-500">
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
                        className="border rounded px-3 py-2 bg-white text-black hover:bg-gray-50 w-[140px] text-left"
                      >
                        {line.account_code || "Select GL"}
                      </button>
                      {line.account_name && (
                        <div className="text-xs text-gray-500">
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
                    className="border rounded p-2 text-black"
                    rows={2}
                  />
                </td>

                {/* QUANTITY */}
                <td className="p-2">
                  <input
                    type="number"
                    value={line.quantity || 0}
                    disabled={isReadonly || line.line_type === "COMMENT"}
                    onChange={(e) =>
                      updateLine(index, "quantity", Number(e.target.value))
                    }
                    className="border rounded p-2 w-[90px] text-right text-black"
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
                        className="border rounded px-3 py-2 bg-white text-black hover:bg-gray-50 w-[160px] text-left"
                      >
                        {line.warehouse_code || "Select Warehouse"}
                      </button>

                      {line.warehouse_name && (
                        <div className="text-xs text-gray-500">
                          {line.warehouse_name}
                        </div>
                      )}

                      {line.reserved_quantity && (
                        <div className="text-xs text-blue-600">
                          Reserved: {line.reserved_quantity}
                        </div>
                      )}

                      {line.available_stock !== undefined &&
                        line.quantity > line.available_stock && (
                          <div className="text-red-600 text-xs">
                            Insufficient stock
                          </div>
                        )}
                    </div>
                  )}
                  {!line.warehouse_id && line.line_type === "ITEM" && (
                    <div className="text-red-500 text-xs mt-1">
                      Warehouse required
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
                    className="border rounded p-2 w-[110px] text-right text-black"
                  />
                </td>

                {/* DISCOUNT TYPE */}
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

                {/* DISCOUNT VALUE */}
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
                    className="border rounded p-2 w-[100px] text-right text-black"
                  />
                </td>

                {/* VAT % */}
                <td className="p-2">
                  <input
                    type="number"
                    value={line.vat_percent || 0}
                    disabled={isReadonly}
                    onChange={(e) =>
                      updateLine(index, "vat_percent", Number(e.target.value))
                    }
                    className="border rounded p-2 w-[90px] text-right text-black"
                  />
                </td>

                {/* CALCULATED FIELDS */}
                <td className="p-2 text-right text-slate-700 dark:text-slate-300">
                  {Number(line.original_amount || 0).toFixed(2)}
                </td>
                <td className="p-2 text-right text-slate-700 dark:text-slate-300">
                  {Number(line.discount_amount || 0).toFixed(2)}
                </td>
                <td className="p-2 text-right font-medium text-slate-900 dark:text-slate-100">
                  {Number(line.net_amount || 0).toFixed(2)}
                </td>
                <td className="p-2 text-right text-slate-700 dark:text-slate-300">
                  {Number(line.vat_amount || 0).toFixed(2)}
                </td>
                <td className="p-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                  {Number(line.gross_amount || 0).toFixed(2)}
                </td>

                {/* ACTIONS */}
                {!isReadonly && (
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {line.line_type === "ITEM" ? (
                        <button
                          type="button"
                          disabled={!line.item_id || !line.warehouse_id}
                          onClick={() => {
                            setActiveAllocationRowKey(index.toString());
                            setIsAllocationModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-20"
                          title="Lot/Serial Allocation Matrix"
                        >
                          <span
                            className={`inline-block w-2.5 h-2.5 rounded-full ${
                              line.is_allocated
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />
                        </button>
                      ) : (
                        <div className="w-4 h-4" />
                      )}

                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>

          {/* FOOTER TOTALS */}
          <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t font-semibold text-slate-900 dark:text-slate-100">
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

      {/* MODALS */}
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

      {isAllocationModalOpen &&
        activeAllocationRowKey !== null &&
        activeAllocationLine && (
          <StockAllocationModal
            key={`debit-note-allocation-row-${activeAllocationRowKey}`}
            open={isAllocationModalOpen}
            onClose={() => {
              setIsAllocationModalOpen(false);
              setActiveAllocationRowKey(null);
            }}
            targetQuantity={activeAllocationLine.quantity || 0}
            itemId={activeAllocationLine.item_id || ""}
            itemCode={activeAllocationLine.item_code || ""}
            itemName={activeAllocationLine.item_name || ""}
            warehouseId={activeAllocationLine.warehouse_id || ""}
            warehouseName={activeAllocationLine.warehouse_name || ""}
            locationName=""
            // Explicitly type the map parameter to perfectly match StockAllocationRecord
            initialAllocations={(activeAllocationLine.allocations || []).map(
              (alloc: StockAllocationRecord) => ({
                date_received: String(alloc.date_received || ""),
                prod_date: String(alloc.prod_date || ""),
                expiry_date: String(alloc.expiry_date || ""),
                batch_no: String(alloc.batch_no || ""),
                serial_no: String(alloc.serial_no || ""),
                quantity: Number(alloc.quantity || 0),
              }),
            )}
            onSave={(allocationsPayload) =>
              handleSaveAllocations(allocationsPayload)
            }
          />
        )}
    </div>
  );
}
