// app/components/purchases/purchase-orders/PurchaseOrderLines.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderLineUI,
} from "@/types/purchase-order";

import MigrationUploadModal from "@/app/components/migration/MigrationUploadModal";

import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

import WarehouseLookupModal, {
  WarehouseLookupRecord,
} from "@/app/components/shared/modals/WarehouseLookupModal";

import PO_StockAllocationModal, {
  PO_StockAllocationRecord,
} from "@/app/components/shared/modals/PO_StockAllocationModal";
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
  lines: PurchaseOrderLineUI[];
  setLines: React.Dispatch<React.SetStateAction<PurchaseOrderLineUI[]>>;
  isReadonly?: boolean;

  purchaseOrder: Partial<PurchaseOrder>;
  refreshLines?: () => Promise<void>;
};

export default function PurchaseOrderLines({
  lines,
  setLines,
  isReadonly = false,
  purchaseOrder,
  refreshLines,
}: Props) {
  const [itemIndex, setItemIndex] = useState<number | null>(null);
  const [glIndex, setGlIndex] = useState<number | null>(null);
  const [warehouseIndex, setWarehouseIndex] = useState<number | null>(null);

  const [vatOptions, setVatOptions] = useState<VatPostingOption[]>([]);

  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [activeAllocationRowKey, setActiveAllocationRowKey] = useState<
    string | null
  >(null);

  const activeAllocationLine = useMemo(() => {
    if (activeAllocationRowKey === null) return null;
    const idx = parseInt(activeAllocationRowKey, 10);
    return lines[idx] || null;
  }, [activeAllocationRowKey, lines]);

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
        is_allocated: false,
        received_quantity: 0,
      },
    ]);
  };

  useEffect(() => {
    async function loadVatOptions() {
      try {
        const busGroupParam = purchaseOrder?.purchase_posting_group_id
          ? `?vat_business_group_id=${purchaseOrder.purchase_posting_group_id}`
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
  }, [purchaseOrder?.purchase_posting_group_id]);

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

  const calculateLine = (
    line: Partial<PurchaseOrderLineUI>,
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
      ...(line as PurchaseOrderLineUI),
      original_amount: original,
      discount_amount: discountAmount,
      net_amount: net,
      vat_amount: vat,
      gross_amount: gross,
    };
  };

  const updateLine = <K extends keyof PurchaseOrderLineUI>(
    index: number,
    field: K,
    value: PurchaseOrderLineUI[K],
  ) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "quantity") {
      updated[index].allocations = undefined;
      updated[index].initialAllocations = undefined;
      updated[index].is_allocated = false;
    }

    updated[index] = calculateLine(updated[index]);
    setLines(updated);
  };

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

  const handleSaveAllocations = (
    allocationsData: PO_StockAllocationRecord[],
  ) => {
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
          initialAllocations: allocationsData,
          is_allocated: totalAllocated === (line.quantity || 0),
        };
      }),
    );

    setIsAllocationModalOpen(false);
    setActiveAllocationRowKey(null);
  };

  const handleDiscountTypeChange = (index: number, value: string) => {
    updateLine(index, "discount_type", value as "PERCENT" | "FIXED");
  };

  return (
    <div className="space-y-2 w-full text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 px-4">
          Purchase Order Lines
        </h3>

        <div className="flex items-center gap-2">
          {purchaseOrder.id && (
            <Button
              type="button"
              onClick={() => setIsMigrationModalOpen(true)}
              variant="save"
              disabled={isReadonly}
            >
              <span>⇧</span>
              Import Items
            </Button>
          )}

          <Button
            type="button"
            onClick={addLine}
            variant="add_line"
            disabled={isReadonly}
          >
            Add Line
          </Button>
        </div>
      </div>

      <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm ">
        <table className="w-full table-fixed text-left text-xs border-collapse min-w-[1300px] p-2">
          <colgroup>
            <col className="w-[110px]" />
            <col className="w-[120px]" />
            <col className="w-[180px]" />
            <col className="w-[70px]" />
            <col className="w-[60px]" />
            <col className="w-[150px]" />
            <col className="w-[90px]" />
            <col className="w-[80px]" />
            <col className="w-[80px]" />
            <col className="w-[95px]" />
            <col className="w-[90px]" />
            <col className="w-[95px]" />
            <col className="w-[100px]" />
            <col className="w-[90px]" />
            {/* {!isReadonly && <col className="w-[90px]" />} */}
          </colgroup>
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 capitalize font-semibold text-slate-600 dark:text-slate-400">
              <th className="p-2 w-[110px]">Type</th>
              <th className="p-2 w-[120px]">No.</th>
              <th className="p-2 w-[180px]">Description</th>
              <th className="p-2 text-right w-[70px]">Qty</th>
              <th className="p-2 w-[60px]">UOM</th>
              <th className="p-2 w-[150px] overflow-hidden">Warehouse</th>
              <th className="p-2 text-right w-[90px]">Unit Cost</th>
              <th className="p-2 w-[80px]">Disc. Type</th>
              <th className="p-2 text-right w-[80px]">Disc. Val</th>
              <th className="p-2 text-right w-[95px]">Disc. Amt</th>
              <th className="p-2 text-right w-[90px]">VAT %</th>
              <th className="p-2 text-right w-[95px]">Net</th>
              <th className="p-2 text-right w-[100px]">Gross</th>
              {/* {!isReadonly && ( */}
              <th className="p-2 text-center w-[90px]">Action</th>
              {/* )} */}
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
              const receivedQty = Number(line.received_quantity || 0);
              const isStockReceived = receivedQty > 0;
              const isFullyReceived =
                receivedQty >= displayQty && displayQty > 0;

              const isLineDisabled = isReadonly || isStockReceived;

              const displayUnitCost = Number(line.unit_cost || 0);
              const displayDiscountValue = Number(line.discount_value || 0);
              const displayDiscountAmount = Number(line.discount_amount || 0);
              const displayVatPercent = Number(line.vat_percent || 0);
              const displayAvailableStock =
                line.available_stock !== undefined
                  ? Number(line.available_stock)
                  : undefined;

              const isAllocationDisabled = !line.item_id || !line.warehouse_id;

              return (
                <tr
                  key={index}
                  className={`border-b transition-colors ${
                    isStockReceived
                      ? "bg-slate-50/70 dark:bg-slate-800/30"
                      : "bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <td className="p-2">
                    <select
                      value={line.line_type || "ITEM"}
                      disabled={isLineDisabled}
                      onChange={(e) =>
                        changeLineType(
                          index,
                          e.target.value as "ITEM" | "GL_ACCOUNT" | "COMMENT",
                        )
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1.5 w-[100px] disabled:opacity-60 disabled:cursor-not-allowed"
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
                          disabled={isLineDisabled}
                          title={line.item_name}
                          onClick={() => setItemIndex(index)}
                          className="border dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-left w-[120px] truncate disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {line.item_code || "Select Item"}
                        </button>
                      </div>
                    )}

                    {line.line_type === "GL_ACCOUNT" && (
                      <div className="space-y-1">
                        <button
                          type="button"
                          title={line.account_name}
                          disabled={isLineDisabled}
                          onClick={() => setGlIndex(index)}
                          className="border dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-left w-[120px] truncate disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {line.account_code || "Select GL"}
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="p-2">
                    <textarea
                      value={line.description || ""}
                      disabled={isLineDisabled}
                      onChange={(e) =>
                        updateLine(index, "description", e.target.value)
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1.5 w-full text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                      rows={1}
                    />
                  </td>

                  <td className="p-2">
                    {/* <input
                      type="number"
                      value={displayQty}
                      disabled={isLineDisabled || line.line_type === "COMMENT"}
                      onChange={(e) =>
                        updateLine(index, "quantity", Number(e.target.value))
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right disabled:opacity-60 disabled:cursor-not-allowed"
                    /> */}
                    <NumericTextInput
                      value={displayQty}
                      allowDecimals={false}
                      disabled={isLineDisabled || line.line_type === "COMMENT"}
                      onChange={(val) => updateLine(index, "quantity", val)}
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>

                  <td className="p-2">
                    <div className="p-1 text-gray-500">
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
                          className="w-full border dark:border-slate-700 rounded px-2 py-1.5 text-xs bg-white dark:bg-slate-800 flex items-center justify-between gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <span className="truncate text-left">
                            {line.warehouse_code || "Select Warehouse"}
                            {line.warehouse_name && ` - ${line.warehouse_name}`}
                            {line.reserved_quantity &&
                              ` - (${Number(line.reserved_quantity)})`}
                          </span>
                        </button>
                      </div>
                    )}
                    {!line.warehouse_id && line.line_type === "ITEM" && (
                      <div className="text-red-500 text-xs">
                        Warehouse required
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    {/* <input
                      type="number"
                      value={displayUnitCost}
                      disabled={isLineDisabled}
                      onChange={(e) =>
                        updateLine(index, "unit_cost", Number(e.target.value))
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right disabled:opacity-60 disabled:cursor-not-allowed"
                    /> */}
                    <NumericTextInput
                      value={displayUnitCost}
                      allowDecimals={true}
                      decimalScale={2}
                      disabled={isLineDisabled}
                      onChange={(val) => updateLine(index, "unit_cost", val)}
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>

                  <td className="p-2">
                    <select
                      value={line.discount_type || "PERCENT"}
                      disabled={isLineDisabled}
                      onChange={(e) =>
                        handleDiscountTypeChange(index, e.target.value)
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full disabled:opacity-60 disabled:cursor-not-allowed"
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
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {/* <input
                      type="number"
                      value={displayDiscountValue}
                      disabled={isLineDisabled}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "discount_value",
                          Number(e.target.value),
                        )
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right disabled:opacity-60 disabled:cursor-not-allowed"
                    /> */}
                  </td>

                  <td className="p-2 text-right font-medium">
                    {displayDiscountAmount.toFixed(2)}
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
                      className="border dark:border-slate-700 dark:bg-slate-800 text-xs rounded p-1.5 w-full bg-white dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">0% (Exempt/Zero)</option>
                      {vatOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.code} ({opt.vat_percent}%)
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-2 text-right font-medium">
                    {Number(line.net_amount || 0).toFixed(2)}
                  </td>

                  <td className="p-2 text-right font-semibold">
                    {Number(line.gross_amount || 0).toFixed(2)}
                  </td>

                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {!isReadonly && line.line_type === "ITEM" ? (
                        <button
                          type="button"
                          disabled={isAllocationDisabled}
                          onClick={() => {
                            setActiveAllocationRowKey(index.toString());
                            setIsAllocationModalOpen(true);
                          }}
                          className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            // 🟡 YELLOW / AMBER = Stock Received
                            isStockReceived
                              ? "text-amber-500 ring-2 ring-amber-300 dark:ring-amber-900"
                              : // 🟢 GREEN = Allocated Stock (Fully allocated)
                                line.is_allocated
                                ? "text-emerald-500"
                                : // 🔴 RED = Partially Allocated (Not fully allocated yet)
                                  "text-rose-500"
                          }`}
                          title={
                            isStockReceived
                              ? `Stock Received (${receivedQty}/${displayQty}).`
                              : line.is_allocated
                                ? "Allocated Stock"
                                : "Partially Allocated"
                          }
                        >
                          <Icon icon="tabler:box-seam" className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="w-4 h-4" />
                      )}

                      {!isStockReceived ? (
                        <button
                          type="button"
                          disabled={isReadonly}
                          onClick={() => removeLine(index)}
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
          const vatBusinessGroupId =
            purchaseOrder.purchase_posting_group_id || "";
          // purchaseOrder.supplier_posting_group_id ||

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

            allocations: undefined,
            initialAllocations: undefined,
            is_allocated: false,
          };

          setLines(updated);
          setWarehouseIndex(null);
        }}
      />

      {isAllocationModalOpen &&
        activeAllocationRowKey !== null &&
        activeAllocationLine && (
          <PO_StockAllocationModal
            key={`allocation-row-${activeAllocationRowKey}`}
            open={isAllocationModalOpen}
            onClose={() => {
              setIsAllocationModalOpen(false);
              setActiveAllocationRowKey(null);
            }}
            targetQuantity={Number(activeAllocationLine.quantity || 0)}
            itemId={activeAllocationLine.item_id || ""}
            itemCode={activeAllocationLine.item_code || ""}
            itemName={activeAllocationLine.item_name || ""}
            warehouseId={activeAllocationLine.warehouse_id || ""}
            warehouseName={activeAllocationLine.warehouse_name || ""}
            uomName={activeAllocationLine.uom_name || ""}
            initialAllocations={(
              activeAllocationLine.allocations ||
              activeAllocationLine.initialAllocations ||
              []
            ).map((alloc) => ({
              location_id: String(alloc.location_id || ""),
              location_name: String(alloc.location_name || ""),
              date_received: String(alloc.date_received || ""),
              prod_date: String(alloc.prod_date || ""),
              expiry_date: String(alloc.expiry_date || ""),
              batch_no: String(alloc.batch_no || ""),
              bin_code: String(alloc.bin_code || ""),
              serial_no: String(alloc.serial_no || ""),
              quantity: Number(alloc.quantity || 0),
            }))}
            onSave={(allocationsPayload) =>
              handleSaveAllocations(allocationsPayload)
            }
          />
        )}

      <MigrationUploadModal
        open={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        purchaseOrder={purchaseOrder}
        onCompleted={async () => {
          if (refreshLines) {
            await refreshLines();
          }

          setIsMigrationModalOpen(false);
        }}
      />
    </div>
  );
}

/* 
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
*/
{
  /* RECEIVED STOCK INDICATOR BADGE */
}
{
  /* {isStockReceived && (
  <div
    className={`text-[10px] font-medium px-1.5 py-0.5 rounded text-center whitespace-nowrap ${
      isFullyReceived
        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
        : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
    }`}
  >
    Rcvd: {receivedQty} / {displayQty}
  </div>
)} */
}
{
  /* 
<tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100">
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
</tfoot> 
*/
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
/* 
{!isReadonly && (
  <td className="p-2 text-center">
    <div className="flex items-center justify-center gap-2">
      {line.line_type === "ITEM" ? (
        <button
          type="button"
          disabled={isAllocationDisabled}
          onClick={() => {
            setActiveAllocationRowKey(index.toString());
            setIsAllocationModalOpen(true);
          }}
          className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            // 🟡 YELLOW / AMBER = Stock Received
            isStockReceived
              ? "text-amber-500 ring-2 ring-amber-300 dark:ring-amber-900"
              : // 🟢 GREEN = Allocated Stock (Fully allocated)
                line.is_allocated
                ? "text-emerald-500"
                : // 🔴 RED = Partially Allocated (Not fully allocated yet)
                  "text-rose-500"
          }`}
          title={
            isStockReceived
              ? `Stock Received (${receivedQty}/${displayQty}).`
              : line.is_allocated
                ? "Allocated Stock"
                : "Partially Allocated"
          }
          // title={
          //   isStockReceived
          //     ? `Stock Received (${receivedQty}/${displayQty}). Allocation locked.`
          //     : isAllocationDisabled
          //       ? "Requires item and warehouse assignment first"
          //       : "Open Allocation Matrix"
          // }
        >

          <Icon icon="tabler:box-seam" className="w-4 h-4" />
        </button>
      ) : (
        <div className="w-4 h-4" />
      )}


      {!isStockReceived ? (
        <button
          type="button"
          onClick={() => removeLine(index)}
          // className="text-red-600 hover:text-red-800 font-medium text-xs"
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
)}
*/
