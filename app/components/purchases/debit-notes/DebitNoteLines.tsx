// app/components/purchases/debit-notes/DebitNoteLines.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { DebitNote, DebitNoteLine } from "@/types/debit-note";

import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

import WarehouseLookupModal, {
  WarehouseLookupRecord,
} from "@/app/components/shared/modals/WarehouseLookupModal";
import StockDeAllocationModal, {
  StockDeAllocationRecord,
} from "../../shared/modals/StockDeAllocationModal";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

export interface DebitNoteLineUI extends DebitNoteLine {
  reserved_quantity?: string | number;
  available_stock?: string | number;
  is_allocated?: boolean;

  allocations?: StockDeAllocationRecord[];

  initialAllocations?: Array<{
    quantity: number;
    [key: string]: unknown;
  }>;
}

type VatPostingOption = {
  id: string;
  code: string;
  description?: string;
  vat_percent: number;
  vat_product_group_id?: string;
};

type Props = {
  lines: DebitNoteLineUI[];
  setLines: React.Dispatch<React.SetStateAction<DebitNoteLineUI[]>>;
  isReadonly?: boolean;

  debitNote: Partial<DebitNote>;
  refreshLines?: () => Promise<void>;
};

export default function DebitNoteLines({
  lines,
  setLines,
  isReadonly = false,
  debitNote,
  refreshLines,
}: Props) {
  const [itemIndex, setItemIndex] = useState<number | null>(null);
  const [glIndex, setGlIndex] = useState<number | null>(null);
  const [warehouseIndex, setWarehouseIndex] = useState<number | null>(null);
  const [vatOptions, setVatOptions] = useState<VatPostingOption[]>([]);

  const [isDeAllocModalOpen, setIsDeAllocModalOpen] = useState(false);
  const [activeDeAllocRowKey, setActiveDeAllocRowKey] = useState<string | null>(
    null,
  );

  const activeDeAllocLine = useMemo(() => {
    if (activeDeAllocRowKey === null) return null;
    const idx = parseInt(activeDeAllocRowKey, 10);
    return lines[idx] || null;
  }, [activeDeAllocRowKey, lines]);

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

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  useEffect(() => {
    async function loadVatOptions() {
      try {
        const busGroupParam = debitNote?.purchase_posting_group_id
          ? `?vat_business_group_id=${debitNote.purchase_posting_group_id}`
          : "";

        const res = await fetch(`/api/lookups/vat-rates${busGroupParam}`);
        if (res.ok) {
          const json = await res.json();
          setVatOptions(json.data || []);
        }
      } catch (err) {
        console.error("Failed to load VAT options:", err);
      }
    }

    loadVatOptions();
  }, [debitNote?.purchase_posting_group_id]);

  const handleVatChange = (index: number, selectedVatOptionId: string) => {
    const selectedOption = vatOptions.find(
      (opt) => opt.id === selectedVatOptionId,
    );
    const updated = [...lines];

    const vatPercent = selectedOption
      ? Number(selectedOption.vat_percent || 0)
      : 0;
    const vatProductGroupId =
      selectedOption?.vat_product_group_id || selectedOption?.id || "";

    updated[index] = calculateLine({
      ...updated[index],
      vat_percent: vatPercent,
      vat_product_posting_group_id: vatProductGroupId,
    });

    setLines(updated);
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
   * De ALLOCATION SAVE HANDLER
   * =====================================================
   */

  const handleSaveDeAllocations = (
    deAllocationsData: StockDeAllocationRecord[],
  ) => {
    if (activeDeAllocRowKey === null) return;
    const targetIdx = parseInt(activeDeAllocRowKey, 10);

    setLines((prev) =>
      prev.map((line, index) => {
        if (index !== targetIdx) return line;

        const totalReturned = deAllocationsData.reduce(
          (sum, d) => sum + d.return_quantity,
          0,
        );

        return {
          ...line,
          allocations: deAllocationsData,
          is_allocated: totalReturned === (line.quantity || 0),
        };
      }),
    );

    setIsDeAllocModalOpen(false);
    setActiveDeAllocRowKey(null);
  };

  const handleDiscountTypeChange = (index: number, value: string) => {
    updateLine(index, "discount_type", value as "PERCENT" | "FIXED");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Debit Note Lines</h3>

        <Button
          type="button"
          onClick={addLine}
          variant="add_line"
          disabled={isReadonly}
        >
          Add Line
        </Button>
      </div>

      <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs border-collapse table-fixed min-w-[1300px]">
          <colgroup>
            <col className="w-[80px]" />
            <col className="w-[120px]" />
            <col className="w-[180px]" />
            <col className="w-[60px]" />
            <col className="w-[60px]" />
            <col className="w-[150px]" />
            <col className="w-[70px]" />
            <col className="w-[80px]" />
            <col className="w-[70px]" />
            <col className="w-[100px]" />
            <col className="w-[75px]" />
            <col className="w-[75px]" />
            <col className="w-[75px]" />
            <col className="w-[75px]" />
            <col className="w-[80px]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 capitalize font-semibold text-slate-600 dark:text-slate-400">
              <th className="p-2 w-[80px]">Type</th>
              <th className="p-2 w-[120px]">No.</th>
              <th className="p-2 w-[180px]">Description</th>
              <th className="p-2 text-right w-[60px]">Qty</th>
              <th className="p-2 w-[60px]">U.O.M</th>
              <th className="p-2 w-[150px]">Warehouse</th>
              <th className="p-2 text-right w-[70px]">Unit Price</th>
              <th className="p-2 w-[80px]">Disc Type</th>
              <th className="p-2 text-right w-[70px]">Discount</th>
              <th className="p-2 text-left w-[100px]">VAT Rate</th>
              <th className="p-2 text-right w-[75px] wrap-break-word">Original Amount</th>
              <th className="p-2 text-right w-[75px] wrap-break-word">Discount Amount</th>
              <th className="p-2 text-right w-[75px] wrap-break-word">Total Amount</th>
              <th className="p-2 text-right w-[75px] wrap-break-word">VAT</th>
              <th className="p-2 text-center w-[80px]">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {lines.length === 0 && (
              <tr>
                <td colSpan={16} className="text-center p-8 text-gray-500 ">
                  No lines added
                </td>
              </tr>
            )}

            {lines.map((line, index) => {
              const displayQty = Number(line.quantity || 0);
              const displayUnitCost = Number(line.unit_cost || 0);

              const displayOriginalAmount = displayUnitCost * displayQty;
              const displayDiscountValue = Number(line.discount_value || 0);
              const displayDiscountAmount = Number(line.discount_amount || 0);
              const displayVATAmount = Number(line.vat_amount || 0);
              const displayVatPercent = Number(line.vat_percent || 0);
              const displayAvailableStock =
                line.available_stock !== undefined
                  ? Number(line.available_stock)
                  : undefined;

              const isAllocationDisabled = !line.item_id || !line.warehouse_id;

              return (
                <tr
                  key={index}
                  className="bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
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
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1.5 w-full text-[11px]"
                    >
                      <option value="ITEM">Item</option>
                      <option value="GL_ACCOUNT">G/L</option>
                    </select>
                  </td>

                  <td className="p-2">
                    {line.line_type === "ITEM" && (
                      <div className="space-y-1">
                        <button
                          type="button"
                          disabled={isReadonly}
                          title={line.item_name}
                          onClick={() => setItemIndex(index)}
                          className="border dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-left w-[120px] text-[11px] truncate"
                        >
                          {line.item_code || "Select Item"}
                        </button>
                      </div>
                    )}

                    {line.line_type === "GL_ACCOUNT" && (
                      <div className="space-y-1">
                        <button
                          type="button"
                          disabled={isReadonly}
                          title={line.account_name}
                          onClick={() => setGlIndex(index)}
                          className="border dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-left w-[120px] text-[11px] truncate"
                        >
                          {line.account_code || "Select GL"}
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="p-2">
                    <textarea
                      value={line.description || ""}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateLine(index, "description", e.target.value)
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded w-full text-[11px] text-xs px-2 py-1.5"
                      rows={1}
                    />
                  </td>

                  <td className="p-2">
                    {/* <input
                      type="number"
                      value={displayQty}
                      disabled={isReadonly || line.line_type === "COMMENT"}
                      onChange={(e) =>
                        updateLine(index, "quantity", Number(e.target.value))
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right"
                    /> */}

                    <NumericTextInput
                      value={displayQty}
                      allowDecimals={false}
                      disabled={isReadonly || line.line_type === "COMMENT"}
                      onChange={(val) => updateLine(index, "quantity", val)}
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right text-[11px]"
                    />
                  </td>

                  <td className="p-2">
                    <div className="p-1 text-gray-500 text-[11px]">
                      {line.uom_name || "-"}
                    </div>
                  </td>

                  <td className="p-2">
                    {line.line_type === "ITEM" && (
                      <div className="space-y-1">
                        <button
                          type="button"
                          disabled={isReadonly}
                          onClick={() => setWarehouseIndex(index)}
                          className="w-full border dark:border-slate-700 rounded px-2 py-1.5 text-[11px] bg-white dark:bg-slate-800 flex items-center justify-between gap-3"
                        >
                          {!line.warehouse_id && (
                            <span className="text-red-500 text-[11px]">
                              Warehouse required
                            </span>
                          )}

                          {line.warehouse_id && (
                            <span className="truncate text-left text-[11px]">
                              {line.warehouse_code || ""}
                              {line.warehouse_name &&
                                ` - ${line.warehouse_name}`}
                              {line.reserved_quantity &&
                                ` - (${Number(line.reserved_quantity)})`}
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    <NumericTextInput
                      value={displayUnitCost}
                      allowDecimals={true}
                      decimalScale={2}
                      disabled={isReadonly}
                      onChange={(val) => updateLine(index, "unit_cost", val)}
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right text-[11px]"
                    />
                  </td>

                  <td className="p-2">
                    <select
                      value={line.discount_type || "PERCENT"}
                      disabled={isReadonly}
                      onChange={(e) =>
                        handleDiscountTypeChange(index, e.target.value)
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-[11px]"
                    >
                      <option value="PERCENT">%</option>
                      <option value="FIXED">Fixed</option>
                    </select>
                  </td>

                  <td className="p-2">
                    <NumericTextInput
                      value={displayDiscountValue}
                      allowDecimals={true}
                      decimalScale={2}
                      disabled={isReadonly}
                      onChange={(val) =>
                        updateLine(index, "discount_value", val)
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right text-[11px]"
                    />
                  </td>

                  <td className="p-2">
                    <select
                      value={
                        vatOptions.find(
                          (opt) =>
                            opt.vat_product_group_id ===
                              line.vat_product_posting_group_id ||
                            opt.id === line.vat_product_posting_group_id ||
                            opt.vat_percent === displayVatPercent,
                        )?.id || ""
                      }
                      disabled={isReadonly || line.line_type === "COMMENT"}
                      onChange={(e) => handleVatChange(index, e.target.value)}
                      className="border dark:border-slate-700 dark:bg-slate-800 text-[11px] rounded p-1.5 w-full bg-white dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">0% (Exempt/Zero)</option>
                      {vatOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.code} ({opt.vat_percent}%)
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-2 text-right font-medium text-[11px]">
                    {displayOriginalAmount.toFixed(2)}
                  </td>
                  <td className="p-2 text-right font-medium text-[11px]">
                    {displayDiscountAmount.toFixed(2)}
                  </td>

                  <td className="p-2 text-right font-medium text-[11px]">
                    {Number(line.net_amount || 0).toFixed(2)}
                  </td>

                  <td className="p-2 text-right font-semibold text-[11px]">
                    {Number(displayVATAmount || 0).toFixed(2)}
                  </td>

                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {line.line_type === "ITEM" ? (
                        <button
                          type="button"
                          title={
                            line.is_allocated ? "De-Allocated" : "Alloc Batches"
                          }
                          disabled={
                            !line.item_id || !line.warehouse_id || isReadonly
                          }
                          onClick={() => {
                            setActiveDeAllocRowKey(String(index));
                            setIsDeAllocModalOpen(true);
                          }}
                          className={`p-1 rounded font-medium flex items-center gap-1 ${
                            line.is_allocated
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          <Icon
                            icon="tabler:box-seam"
                            className="w-3.5 h-3.5"
                          />
                          {/* <span>
                              {line.is_allocated
                                ? "De-Allocated"
                                : "Alloc Batches"}
                            </span> */}
                        </button>
                      ) : (
                        <div className="w-4 h-4" />
                      )}

                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        disabled={isReadonly}
                        className="text-red-600 hover:text-red-800 p-1 rounded font-medium bg-slate-100  dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                      >
                        <Icon icon="lucide:x" className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODALS */}

      <ItemLookupModal
        open={itemIndex !== null}
        onClose={() => setItemIndex(null)}
        onSelect={async (item: ItemLookupRecord) => {
          if (itemIndex === null) return;
          const updated = [...lines];

          // 1. Fetch Default Warehouse for the Item
          let defaultWarehouse: {
            id?: string;
            code?: string;
            name?: string;
          } | null = null;
          try {
            const warehouseResponse = await fetch(
              `/api/lookups/default-warehouse?item_id=${item.id}`,
            );
            if (warehouseResponse.ok) {
              const warehouseData = await warehouseResponse.json();
              defaultWarehouse = warehouseData.data;
            }
          } catch (err) {
            console.error("Failed to fetch default warehouse:", err);
          }

          // 2. Resolve VAT Business Posting Group from Supplier / Purchase Order
          const vatBusinessGroupId = debitNote.purchase_posting_group_id || "";
          // debitNote.supplier_posting_group_id ||

          // 3. Resolve Product Posting Group from Item lookup (using vat_product_group_id from ItemLookupRecord)
          const vatProductGroupId = item.vat_product_group_id || "";

          // 4. Query VAT Posting Setup matrix to get the exact VAT percentage
          let calculatedVatPercent = 0;

          if (vatBusinessGroupId && vatProductGroupId) {
            try {
              const vatParams = new URLSearchParams({
                vat_business_group_id: vatBusinessGroupId,
                vat_product_group_id: vatProductGroupId,
              });

              const vatResponse = await fetch(
                `/api/lookups/vat-posting-setup?${vatParams.toString()}`,
              );

              if (vatResponse.ok) {
                const vatData = await vatResponse.json();
                // Expecting vat_rate or vat_percent from the lookup API result
                calculatedVatPercent = Number(
                  vatData.data?.vat_rate ?? vatData.data?.vat_percent ?? 0,
                );
              }
            } catch (err) {
              console.error("Error resolving VAT posting setup rate:", err);
            }
          }

          updated[itemIndex] = calculateLine({
            ...updated[itemIndex],

            line_type: "ITEM",

            item_id: item.id,
            item_code: item.item_code,
            item_name: item.name,

            description: item.description || item.name,

            unit_cost: Number(item.standard_cost || 0),

            uom_id: item.base_uom_id,
            uom_name: item.base_uom_name || updated[itemIndex].uom_name,

            vat_percent: calculatedVatPercent,
            vat_business_posting_group_id: vatBusinessGroupId,
            vat_product_posting_group_id: vatProductGroupId,

            warehouse_id: defaultWarehouse?.id,
            warehouse_code: defaultWarehouse?.code,
            warehouse_name: defaultWarehouse?.name,

            allocations: undefined,
            initialAllocations: undefined,
            is_allocated: false,
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

      {isDeAllocModalOpen &&
        activeDeAllocRowKey !== null &&
        activeDeAllocLine && (
          <StockDeAllocationModal
            open={isDeAllocModalOpen}
            onClose={() => {
              setIsDeAllocModalOpen(false);
              setActiveDeAllocRowKey(null);
            }}
            requiredQuantity={activeDeAllocLine.quantity || 0}
            debitNoteLineId={activeDeAllocLine.id}
            purchaseOrderLineId={activeDeAllocLine.purchase_order_line_id}
            purchaseInvoiceLineId={activeDeAllocLine.purchase_invoice_line_id}
            initialAllocations={activeDeAllocLine.allocations}
            itemCode={activeDeAllocLine.item_code}
            itemName={activeDeAllocLine.item_name}
            warehouseName={activeDeAllocLine.warehouse_name}
            onSave={handleSaveDeAllocations}
          />
        )}
    </div>
  );
}

{
  /* <div className="flex items-center gap-3 shrink-0">
        // ✅ RESERVED STOCK INDICATOR
        {line.reserved_quantity && (
          <span className="text-blue-600 whitespace-nowrap">
            Reserved: {Number(line.reserved_quantity)}
          </span>
        )}

        // ❗ STOCK WARNING
        {displayAvailableStock !== undefined &&
          displayQty > displayAvailableStock && (
            <span className="text-red-600 font-medium whitespace-nowrap">
              Insufficient stock
            </span>
          )}
      </div> */
}

/**
 * =====================================================
 * TOTALS
 * =====================================================
 */
/* const totals = useMemo(() => {
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
  }, [lines]); */

{
  /* <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100">
        <tr>
          <td
            colSpan={9}
            className="p-2.5 text-right capitalize tracking-wider text-xs"
          >
            Totals
          </td>
          <td className="p-2.5 text-right font-mono text-amber-600 dark:text-amber-400">
            {totals.discount.toFixed(2)}
          </td>
          <td className="p-2.5" />
          <td className="p-2.5 text-right font-mono">
            {totals.net.toFixed(2)}
          </td>
          <td className="p-2.5 text-right font-mono">
            {totals.gross.toFixed(2)}
          </td>
          {!isReadonly && <td />}
        </tr>
      </tfoot> */
}

/* export type DebitNoteLineUI = DebitNoteLine & {
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
  purchase_order_line_id?: string;
  purchase_invoice_line_id?: string;
  allocations?: StockDeAllocationRecord[];
}; */
{
  /* <ItemLookupModal
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
/> */
}
{
  /* {isAllocationModalOpen &&
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
        )} */
}
