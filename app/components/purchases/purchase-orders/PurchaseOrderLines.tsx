// app/components/purchases/purchase-orders/PurchaseOrderLines.tsx

"use client";

import { useMemo, useState } from "react";
import { PurchaseOrderLine, PurchaseOrderLineUI } from "@/types/purchase-order";

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

type Props = {
  lines: PurchaseOrderLineUI[];
  setLines: React.Dispatch<React.SetStateAction<PurchaseOrderLineUI[]>>;
  isReadonly?: boolean;
};

// interface LocationLookupRecord {
//   id: string;
//   warehouse_id: string;
//   parent_id: string | null;
//   type: string;
//   title: string;
//   code: string | null;
//   is_primary: boolean;
//   capacity: number | null;
//   parent_location_title: string | null;
// }

export default function PurchaseOrderLines({
  lines,
  setLines,
  isReadonly = false,
}: Props) {
  const [itemIndex, setItemIndex] = useState<number | null>(null);
  const [glIndex, setGlIndex] = useState<number | null>(null);
  const [warehouseIndex, setWarehouseIndex] = useState<number | null>(null);

  // const [rowLocationsCache, setRowLocationsCache] = useState<
  //   Record<number, LocationLookupRecord[]>
  // >({});
  // const [activeLocationSelectorIndex, setActiveLocationSelectorIndex] =
  //   useState<number | null>(null);

  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [activeAllocationRowKey, setActiveAllocationRowKey] = useState<
    string | null
  >(null);

  const activeAllocationLine = useMemo(() => {
    if (activeAllocationRowKey === null) return null;
    const idx = parseInt(activeAllocationRowKey, 10);
    return lines[idx] || null;
  }, [activeAllocationRowKey, lines]);

  // const fetchLocationsForSpecificRow = async (
  //   rowIndex: number,
  //   warehouseId: string,
  // ) => {
  //   if (!warehouseId) {
  //     setRowLocationsCache((prev) => ({ ...prev, [rowIndex]: [] }));
  //     return;
  //   }
  //   try {
  //     const res = await fetch(
  //       `/api/lookups/locations?warehouse_id=${warehouseId}`,
  //     );
  //     if (res.ok) {
  //       const payload = await res.json();

  //       const data: LocationLookupRecord[] = payload.data || [];

  //       setRowLocationsCache((prev) => ({
  //         ...prev,
  //         [rowIndex]: data,
  //       }));
  //     }
  //   } catch (err) {
  //     console.error("Failed pulling targeted location indices:", err);
  //   }
  // };

  // useEffect(() => {
  //   lines.forEach((line, index) => {
  //     if (line.line_type === "ITEM" && line.warehouse_id && !rowLocationsCache[index]) {
  //       fetchLocationsForSpecificRow(index, line.warehouse_id);
  //     }
  //   });
  // }, [lines, rowLocationsCache]);

  // ADD LINE
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
      },
    ]);
  };

  // REMOVE LINE
  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
    // setRowLocationsCache((prev) => {
    //   const copy = { ...prev };
    //   delete copy[index];
    //   return copy;
    // });
  };

  // CALCULATE LINE
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

  // UPDATE LINE
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

  // CHANGE LINE TYPE
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

      // location_id: undefined,
      // location_code: undefined,
      // location_name: undefined,

      allocations: undefined,
      is_allocated: false,
    };

    setLines(updated);
  };

  // ALLOCATION SAVE HANDLER

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

  // TOTALS
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
    <div className="space-y-2 w-full text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Purchase Order Lines
        </h3>

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

      <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-slate-600 dark:text-slate-400">
              <th className="p-2 w-[110px]">Type</th>
              <th className="p-2 w-[130px]">No.</th>
              <th className="p-2 w-[200px]">Description</th>
              <th className="p-2 text-right w-[80px]">Qty</th>
              <th className="p-2 w-[70px]">UOM</th>
              <th className="p-2 w-[160px]">Warehouse</th>
              {/* <th className="p-2 w-[160px]">Location</th> */}
              <th className="p-2 text-right w-[95px]">Unit Cost</th>
              <th className="p-2 w-[85px]">Disc Type</th>
              <th className="p-2 text-right w-[85px]">Discount</th>
              <th className="p-2 text-right w-[75px]">VAT %</th>
              <th className="p-2 text-right w-[95px]">Net</th>
              <th className="p-2 text-right w-[100px]">Gross</th>
              {!isReadonly && (
                <th className="p-2 text-center w-[110px]">Action</th>
              )}
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
              const displayDiscountValue = Number(line.discount_value || 0);
              const displayVatPercent = Number(line.vat_percent || 0);
              const displayAvailableStock =
                line.available_stock !== undefined
                  ? Number(line.available_stock)
                  : undefined;

              // const currentLocations = rowLocationsCache[index] || [];
              // const isAllocationDisabled =
              //   !line.item_id || !line.warehouse_id || !line.location_id;

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
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1.5 w-[100px]"
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
                          onClick={() => setItemIndex(index)}
                          className="border dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-left w-[120px] truncate"
                        >
                          {line.item_code || "Select Item"}
                        </button>

                        {line.item_name && (
                          <div className="text-[10px] text-gray-500 max-w-[120px] truncate">
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
                          className="border dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-left w-[120px] truncate"
                        >
                          {line.account_code || "Select GL"}
                        </button>

                        {line.account_name && (
                          <div className="text-[10px] text-gray-500 max-w-[120px] truncate">
                            {line.account_name}
                          </div>
                        )}
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
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-xs"
                      rows={2}
                    />
                  </td>

                  <td className="p-2">
                    <input
                      type="number"
                      value={displayQty}
                      disabled={isReadonly || line.line_type === "COMMENT"}
                      onChange={(e) =>
                        updateLine(index, "quantity", Number(e.target.value))
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right"
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
                          disabled={isReadonly}
                          onClick={() => setWarehouseIndex(index)}
                          className="border dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-left w-full truncate"
                        >
                          {line.warehouse_code || "Select Warehouse"}
                        </button>

                        {line.warehouse_name && (
                          <div className="text-xs ">{line.warehouse_name}</div>
                        )}

                        {/* ✅ RESERVED STOCK INDICATOR */}
                        {line.reserved_quantity && (
                          <div className="text-xs text-blue-600">
                            Reserved: {Number(line.reserved_quantity)}
                          </div>
                        )}

                        {/* ❗ STOCK WARNING */}
                        {displayAvailableStock !== undefined &&
                          displayQty > displayAvailableStock && (
                            <div className="text-red-600 text-xs font-medium">
                              Insufficient stock
                            </div>
                          )}
                      </div>
                    )}
                    {!line.warehouse_id && line.line_type === "ITEM" && (
                      <div className="text-red-500 text-xs">
                        Warehouse required
                      </div>
                    )}
                  </td>
                  {/* <td className="p-2">
                    {line.line_type === "ITEM" ? (
                      <select
                        value={line.location_id || ""}
                        disabled={isReadonly || !line.warehouse_id}
                        onFocus={() => {
                          if (
                            line.warehouse_id &&
                            currentLocations.length === 0
                          ) {
                            fetchLocationsForSpecificRow(
                              index,
                              line.warehouse_id,
                            );
                          }
                        }}
                        onChange={(e) => {
                          const selectedLoc = currentLocations.find(
                            (l) => l.id === e.target.value,
                          );
                          const updated = [...lines];
                          updated[index] = {
                            ...updated[index],
                            location_id: selectedLoc?.id || undefined,
                            location_code:
                              selectedLoc?.code ||
                              selectedLoc?.title ||
                              undefined,
                            location_name: selectedLoc?.title || undefined,

                            allocations: undefined,
                            is_allocated: false,
                          };
                          setLines(updated);
                        }}
                        className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded p-1.5 w-full text-xs text-black dark:text-slate-100 disabled:opacity-50"
                      >
                        <option value="">-- Select Location --</option>
                        {currentLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.code
                              ? `${loc.code} - ${loc.title}`
                              : loc.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-gray-400">-</div>
                    )}
                  </td> */}
                  <td className="p-2">
                    <input
                      type="number"
                      value={displayUnitCost}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateLine(index, "unit_cost", Number(e.target.value))
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right"
                    />
                  </td>

                  <td className="p-2">
                    <select
                      value={line.discount_type || "PERCENT"}
                      disabled={isReadonly}
                      // onChange={(e) => updateLine(index, "discount_type", e.target.value as "PERCENT" | "FIXED"
                      onChange={(e) =>
                        handleDiscountTypeChange(index, e.target.value)
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full"
                    >
                      <option value="PERCENT">%</option>
                      <option value="FIXED">Fixed</option>
                    </select>
                  </td>

                  <td className="p-2">
                    <input
                      type="number"
                      value={displayDiscountValue}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "discount_value",
                          Number(e.target.value),
                        )
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right"
                    />
                  </td>

                  <td className="p-2">
                    <input
                      type="number"
                      value={displayVatPercent}
                      disabled={isReadonly}
                      onChange={(e) =>
                        updateLine(index, "vat_percent", Number(e.target.value))
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right"
                    />
                  </td>

                  <td className="p-2 text-right font-medium">
                    {Number(line.net_amount || 0).toFixed(2)}
                  </td>

                  <td className="p-2 text-right font-semibold">
                    {Number(line.gross_amount || 0).toFixed(2)}
                  </td>

                  {!isReadonly && (
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {line.line_type === "ITEM" ? (
                          <button
                            type="button"
                            disabled={isAllocationDisabled}
                            // disabled={!line.item_id || !line.warehouse_id}
                            onClick={() => {
                              setActiveAllocationRowKey(index.toString());
                              setIsAllocationModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title={
                              isAllocationDisabled
                                ? "Requires item and warehouse assignment first"
                                : "Open Allocation Matrix"
                            }
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
              );
            })}
          </tbody>

          <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100">
            <tr>
              <td
                colSpan={10}
                className="p-2.5 text-right uppercase tracking-wider text-xs"
              >
                Totals
              </td>
              <td className="p-2.5 text-right font-mono">
                {totals.net.toFixed(2)}
              </td>
              <td className="p-2.5 text-right font-mono">
                {totals.gross.toFixed(2)}
              </td>
              {!isReadonly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ITEM LOOKUP */}

      <ItemLookupModal
        open={itemIndex !== null}
        onClose={() => setItemIndex(null)}
        onSelect={async (item: ItemLookupRecord) => {
          if (itemIndex === null) return;
          const updated = [...lines];

          const warehouseResponse = await fetch(
            `/api/lookups/default-warehouse?item_id=${item.id}`,
          );

          const warehouseData = await warehouseResponse.json();

          const defaultWarehouse = warehouseData.data;

          updated[itemIndex] = calculateLine({
            ...updated[itemIndex],

            line_type: "ITEM",

            item_id: item.id,
            item_code: item.item_code,
            item_name: item.name,

            description: item.description || item.name,

            unit_cost: Number(item.standard_cost || 0),

            uom_id: item.base_uom_id,

            warehouse_id: defaultWarehouse?.id,
            warehouse_code: defaultWarehouse?.code,
            warehouse_name: defaultWarehouse?.name,

            allocations: undefined,
            initialAllocations: undefined,
            is_allocated: false,
          });

          // updated[itemIndex] = calculateLine({
          //   ...updated[itemIndex],
          //   line_type: "ITEM",
          //   item_id: item.id,
          //   item_code: item.item_code,
          //   item_name: item.name,
          //   description: item.description || item.name,
          //   unit_cost: Number(item.standard_cost || 0),
          //   uom_id: item.base_uom_id,
          //   // uom_name: item.base_uom_code,
          //   purchase_gl_id: item.purchase_gl_id,
          //   sales_gl_id: item.sales_gl_id,
          //   inventory_gl_id: item.inventory_gl_id,
          // });

          setLines(updated);
          setItemIndex(null);
        }}
      />

      {/* GL ACCOUNT LOOKUP */}

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

      {/* WAREHOUSE LOOKUP */}

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

            //   location_id: undefined,
            //   location_code: undefined,
            //   location_name: undefined,

            allocations: undefined,
            initialAllocations: undefined,
            is_allocated: false,
          };

          setLines(updated);
          setWarehouseIndex(null);
        }}
      />

      {/* RENDER DYNAMIC STOCK ALLOCATION PORTAL */}
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
            // locationId={activeAllocationLine.location_id || ""}
            // locationName={activeAllocationLine.location_name || ""}
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
    </div>
  );
}
