// app/components/purchases/debit-notes/DebitNoteLines.tsx

"use client";

import { useEffect, useState } from "react"; //useMemo,
import { Icon } from "@iconify/react";
import { DebitNote, DebitNoteLine, DebitNoteLineUI } from "@/types/debit-note";

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
  const [glModalOpen, setGlModalOpen] = useState(false);

  const [glIndex, setGlIndex] = useState<number | null>(null);
  const [warehouseIndex, setWarehouseIndex] = useState<number | null>(null);

  const [vatOptions, setVatOptions] = useState<VatPostingOption[]>([]);

  const [isDeAllocModalOpen, setIsDeAllocModalOpen] = useState(false);

  const [activeDeAllocationLineKey, setActiveDeAllocationLineKey] = useState<
    string | null
  >(null);

  // const activeDeAllocLine =
  //   lines.find(
  //     (line) => (line._stableKey || line.id) === activeDeAllocationLineKey,
  //   ) || null;

  const getLineKey = (line: DebitNoteLineUI): string | null => {
    return line._stableKey || line.id || null;
  };

  const activeDeAllocLine =
    lines.find((line) => getLineKey(line) === activeDeAllocationLineKey) ??
    null;

  const createEmptyLine = (
    lineType: "ITEM" | "GL_ACCOUNT",
  ): DebitNoteLineUI => ({
    _stableKey: `temp-line-${crypto.randomUUID()}`,
    line_type: lineType,

    item_id: undefined,
    item_code: undefined,
    item_name: undefined,

    gl_account_id: undefined,
    account_code: undefined,
    account_name: undefined,

    description: "",
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

    warehouse_id: undefined,
    warehouse_code: undefined,
    warehouse_name: undefined,

    is_allocated: false,
    reserved_quantity: 0,

    allocations: [],
    initialAllocations: [],
  });

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

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const addGLLine = () => {
    setGlModalOpen(true);
  };

  const handleMultipleGLSelect = (accounts: GLAccountLookupRecord[]) => {
    if (!accounts.length) {
      setGlModalOpen(false);
      return;
    }

    const newLines = accounts.map((account) =>
      calculateLine({
        ...createEmptyLine("GL_ACCOUNT"),

        line_type: "GL_ACCOUNT",

        gl_account_id: account.id,
        account_code: account.code,
        account_name: account.name,

        description: account.name,
      }),
    );

    setLines((prev) => [...prev, ...newLines]);

    setGlModalOpen(false);
  };

  const calculateLine = (line: Partial<DebitNoteLineUI>): DebitNoteLineUI => {
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

    const currentAllocations =
      line.allocations || line.initialAllocations || [];
    const totalAllocated = currentAllocations.reduce(
      (sum, a) => sum + Number(a.allocated_quantity || 0),
      0,
    );

    return {
      ...(line as DebitNoteLineUI),
      original_amount: original,
      discount_amount: discountAmount,
      net_amount: net,
      vat_amount: vat,
      gross_amount: gross,
      allocations: currentAllocations,
      initialAllocations: line.initialAllocations || currentAllocations,
      is_allocated: qty > 0 && totalAllocated === qty,
    };
  };

  const updateLine = <K extends keyof DebitNoteLineUI>(
    index: number,
    field: K,
    value: DebitNoteLineUI[K],
  ) => {
    const updated = [...lines];
    const targetLine = { ...updated[index], [field]: value };

    // Reset allocations if quantity changes
    if (field === "quantity") {
      targetLine.allocations = [];
      targetLine.initialAllocations = [];
      targetLine.is_allocated = false;
    }

    updated[index] = calculateLine(targetLine);
    setLines(updated);
  };

  const handleSaveDeAllocations = (
    deAllocationsData: StockDeAllocationRecord[],
  ) => {
    if (!activeDeAllocationLineKey) return;

    setLines((prev) =>
      prev.map((line) => {
        const key = line._stableKey || line.id;

        if (key !== activeDeAllocationLineKey) {
          return line;
        }

        const totalAllocated = deAllocationsData.reduce(
          (sum, allocation) => sum + Number(allocation.allocated_quantity || 0),
          0,
        );

        const quantity = Number(line.quantity || 0);

        return {
          ...line,
          allocations: deAllocationsData,
          initialAllocations: deAllocationsData,
          is_allocated: quantity > 0 && totalAllocated >= quantity,
        };
      }),
    );

    setIsDeAllocModalOpen(false);
    setActiveDeAllocationLineKey(null);
  };

  const handleDiscountTypeChange = (index: number, value: string) => {
    updateLine(index, "discount_type", value as "PERCENT" | "FIXED");
  };

  return (
    <div className="space-y-2 w-full text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 px-4">
          Debit Note Lines
        </h3>

        <div className="flex items-center gap-2">
          {/* <Button
            type="button"
            onClick={addLine}
            variant="add_line"
            disabled={isReadonly}
          >
            Add Line
          </Button> */}
          <Button
            type="button"
            onClick={addGLLine}
            variant="add_line"
            disabled={isReadonly}
          >
            Select G/L
          </Button>
        </div>
      </div>
      <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm ">
        <table className="w-full table-fixed text-left text-xs border-collapse min-w-[1300px] p-2">
          <colgroup>
            <col className="w-[80px]" />
            <col className="w-[120px]" />
            <col className="w-[180px]" />
            <col className="w-[65px]" />
            <col className="w-[60px]" />
            <col className="w-[150px]" />
            <col className="w-[90px]" />
            <col className="w-[90px]" />
            <col className="w-[90px]" />
            <col className="w-[120px]" />
            <col className="w-[90px]" />
            <col className="w-[80px]" />
            <col className="w-[90px]" />
            <col className="w-[80px]" />
            <col className="w-[80px]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 capitalize font-semibold text-slate-600 dark:text-slate-400">
              <th className="p-2 w-[80px]">Type</th>
              <th className="p-2 w-[120px]">No</th>
              <th className="p-2 w-[180px]">Description</th>
              <th className="p-2 text-right w-[65px]">Qty</th>
              <th className="p-2 w-[60px]">UOM</th>
              <th className="p-2 w-[150px]">Warehouse</th>
              <th className="p-2 text-right w-[90px]">Unit Price</th>
              <th className="p-2 w-[90px]">Disc. Type</th>
              <th className="p-2 text-right w-[90px]">Discount</th>
              <th className="p-2 text-left w-[120px]">VAT Rate</th>
              <th className="p-2 text-right w-[90px] wrap-break-word">
                Original Amount
              </th>
              <th className="p-2 text-right w-[80px] wrap-break-word">
                Discount Amount
              </th>
              <th className="p-2 text-right w-[90px] wrap-break-word">
                Total Amount
              </th>
              <th className="p-2 text-right w-[80px] wrap-break-word">VAT</th>
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
              const returnedQty = Number(line.returned_quantity || 0);
              const isStockReturned = returnedQty > 0;
              const isFullyReturned =
                returnedQty >= displayQty && displayQty > 0;

              const isLineDisabled = isReadonly || isStockReturned;

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

              const currentAllocations =
                line.allocations || line.initialAllocations || [];
              const totalAllocated = currentAllocations.reduce(
                (sum, a) => sum + Number(a.allocated_quantity || 0),
                0,
              );
              const isFullyAllocated =
                displayQty > 0 && totalAllocated === displayQty;
              const isPartiallyAllocated =
                totalAllocated > 0 && totalAllocated < displayQty;

              return (
                <tr
                  // key={index}
                  key={line._stableKey}
                  className={`border-b transition-colors ${
                    isStockReturned
                      ? "bg-slate-50/70 dark:bg-slate-800/30"
                      : "bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <td className="p-2">
                    <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      {line.line_type === "ITEM" ? "Item" : "G/L"}
                    </div>
                  </td>

                  <td className="p-2">
                    {line.line_type === "ITEM" && (
                      <div className="space-y-1">
                        <button
                          type="button"
                          disabled={isLineDisabled}
                          title={line.item_name}
                          onClick={() => setItemIndex(index)}
                          className="border dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-left w-full text-[11px] truncate disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {line.item_code || "Select Item"}
                        </button>
                      </div>
                    )}

                    {line.line_type === "GL_ACCOUNT" && (
                      <div className="space-y-1">
                        <button
                          type="button"
                          disabled={isLineDisabled}
                          title={line.account_name}
                          onClick={() => setGlIndex(index)}
                          className="border dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-left w-full text-[11px] truncate disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {line.account_code || "Select GL"}
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="p-2">
                    <input
                      value={line.description || ""}
                      disabled={isLineDisabled}
                      onChange={(e) =>
                        updateLine(index, "description", e.target.value)
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1.5 w-full text-[11px] disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </td>

                  <td className="p-2">
                    <NumericTextInput
                      value={displayQty}
                      allowDecimals={false}
                      disabled={isLineDisabled || line.line_type === "COMMENT"}
                      onChange={(val) => updateLine(index, "quantity", val)}
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1.5 w-full text-[11px] text-right disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                          disabled={isLineDisabled}
                          onClick={() => setWarehouseIndex(index)}
                          className="w-full border dark:border-slate-700 rounded px-2 py-1.5 text-[11px] bg-white dark:bg-slate-800 flex items-center justify-between gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
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
                      disabled={isLineDisabled}
                      onChange={(val) => updateLine(index, "unit_cost", val)}
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1.5 w-full text-right text-[11px] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>

                  <td className="p-2">
                    <select
                      value={line.discount_type || "PERCENT"}
                      disabled={isLineDisabled}
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
                      disabled={isLineDisabled}
                      onChange={(val) =>
                        updateLine(index, "discount_value", val)
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1.5 w-full text-[11px] text-right disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                      disabled={isLineDisabled || line.line_type === "COMMENT"}
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
                          disabled={isReadonly}
                          onClick={() => {
                            // const key = line._stableKey || line.id;
                            const key = getLineKey(line);

                            console.log("Opening allocation modal", {
                              key,
                              line,
                            });

                            if (!key) {
                              console.error(
                                "Allocation line has no stable key",
                                line,
                              );
                              return;
                            }

                            setActiveDeAllocationLineKey(key);
                            setIsDeAllocModalOpen(true);
                          }}
                          className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            isStockReturned
                              ? "text-amber-500"
                              : isFullyAllocated || line.is_allocated
                                ? "text-emerald-500"
                                : isPartiallyAllocated
                                  ? "text-amber-500"
                                  : "text-indigo-500"
                          }`}
                          title={
                            isStockReturned
                              ? `Stock Returned (${returnedQty}/${displayQty})`
                              : isFullyAllocated || line.is_allocated
                                ? "DeAllocated Stock (Complete)"
                                : isPartiallyAllocated
                                  ? `Partially De-Allocated (${totalAllocated}/${displayQty})`
                                  : "Not De-Allocated"
                          }
                        >
                          <Icon icon="tabler:box-seam" className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="w-4 h-4" />
                      )}

                      {!isStockReturned ? (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          disabled={isReadonly}
                          className="text-red-600 hover:text-red-800 p-1 rounded font-medium bg-slate-100  dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                        >
                          <Icon icon="lucide:x" className="w-4 h-4" />
                        </button>
                      ) : (
                        <span
                          className="text-[10px] text-slate-400 italic cursor-help"
                          title="Line locked because stock has been received against it."
                        >
                          -
                        </span>
                      )}
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
        open={glModalOpen}
        onClose={() => setGlModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={handleMultipleGLSelect}
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

      {isDeAllocModalOpen && activeDeAllocLine && (
        <StockDeAllocationModal
          open={isDeAllocModalOpen}
          onClose={() => {
            setIsDeAllocModalOpen(false);
            setActiveDeAllocationLineKey(null);
          }}
          requiredQuantity={Number(activeDeAllocLine.quantity || 0)}
          debitNoteLineId={activeDeAllocLine.id}
          purchaseOrderLineId={activeDeAllocLine.purchase_order_line_id}
          purchaseInvoiceLineId={activeDeAllocLine.purchase_invoice_line_id}
          initialAllocations={
            activeDeAllocLine.allocations ||
            activeDeAllocLine.initialAllocations ||
            []
          }
          itemCode={activeDeAllocLine.item_code}
          itemName={activeDeAllocLine.item_name}
          warehouseName={activeDeAllocLine.warehouse_name}
          onSave={handleSaveDeAllocations}
        />
      )}
    </div>
  );
}

// const [isDeAllocModalOpen, setIsDeAllocModalOpen] = useState(false);
// const [activeDeAllocRowKey, setActiveDeAllocRowKey] = useState<string | null>(
//   null,
// );

// Ensure each line has a fallback stable key for unsaved rows
// const linesWithKeys = useMemo(() => {
//   return lines.map((line, idx) => ({
//     ...line,
//     _stableKey: line.id || `temp-line-${idx}`,
//   }));
// }, [lines]);

// const linesWithKeys = useMemo(() => {
//   return lines.map((line) => ({
//     ...line,
//     _stableKey: line._stableKey || line.id || crypto.randomUUID(),
//   }));
// }, [lines]);

// const activeDeAllocLine = useMemo(() => {

//   if (!activeDeAllocationLineId) return null;
//   return (
//     linesWithKeys.find((l) => (l._stableKey || l.id) === activeDeAllocationLineId) ||
//     null
//   );
// }, [activeDeAllocationLineId, linesWithKeys]);

// const activeDeAllocLine = useMemo(() => {
//   if (!activeDeAllocationLineId) return null;

//   return (
//     lines.find(
//       (line) => (line._stableKey || line.id) === activeDeAllocationLineId,
//     ) || null
//   );
// }, [activeDeAllocationLineId, lines]);

/* const handleSaveDeAllocations = (
    deAllocationsData: StockDeAllocationRecord[],
  ) => {
    if (!activeDeAllocationLineId) return;

    setLines((prev) =>
      prev.map((line, index) => {
        const lineKey = line.id || `temp-line-${index}`;
        if (lineKey !== activeDeAllocationLineId) return line;

        const totalAllocated = deAllocationsData.reduce(
          (sum, a) => sum + Number(a.allocated_quantity || 0),
          0,
        );
        const lineQty = Number(line.quantity || 0);

        return {
          ...line,
          allocations: deAllocationsData,
          initialAllocations: deAllocationsData,
          is_allocated: lineQty > 0 && totalAllocated === lineQty,
        };
      }),
    );

    setIsDeAllocModalOpen(false);
    setActiveDeAllocRowKey(null);
  }; */

// onClick={() => {
//   setActiveDeAllocRowKey(String(index));
//   setIsDeAllocModalOpen(true);
// }}
// onClick={() => {
//   const lineKey = line._stableKey || line.id;

//   if (!lineKey) {
//     console.error(
//       "Unable to identify debit note line for allocation",
//       line,
//     );
//     return;
//   }

//   setActiveDeAllocationLineId(lineKey);
//   setActiveDeAllocRowKey(lineKey);
//   setIsDeAllocModalOpen(true);
// }}
/* {isDeAllocModalOpen &&
        activeDeAllocRowKey !== null &&
        activeDeAllocLine && (
          <StockDeAllocationModal
            open={isDeAllocModalOpen}
            onClose={() => {
              setIsDeAllocModalOpen(false);
              setActiveDeAllocRowKey(null);
              setActiveDeAllocationLineId(null);
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
        )} */

/* <GLAccountLookupModal
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
      /> */

/* const changeLineType = (
    index: number,
    type: "ITEM" | "GL_ACCOUNT" | "COMMENT",
  ) => {
    const updated = [...lines];

    updated[index] = calculateLine({
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
      allocations: [],
      initialAllocations: [],
      is_allocated: false,
    });

    setLines(updated);
  }; */
