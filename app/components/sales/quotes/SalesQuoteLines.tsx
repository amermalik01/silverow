// app/components/sales/quotes/SalesQuoteLines.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";

import { SalesQuote, SalesQuoteLineUI } from "@/types/sales-quote";

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
  lines: SalesQuoteLineUI[];
  setLines: React.Dispatch<React.SetStateAction<SalesQuoteLineUI[]>>;
  isReadonly?: boolean;

  salesQuote: Partial<SalesQuote>;
  refreshLines?: () => Promise<void>;
};

export default function SalesQuoteLines({
  lines,
  setLines,
  isReadonly = false,
  salesQuote,
  refreshLines,
}: Props) {
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [glModalOpen, setGlModalOpen] = useState(false);

  const [itemIndex, setItemIndex] = useState<number | null>(null);
  const [glIndex, setGlIndex] = useState<number | null>(null);

  const [warehouseIndex, setWarehouseIndex] = useState<number | null>(null);

  const [vatOptions, setVatOptions] = useState<VatPostingOption[]>([]);

  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);

  const [activeAllocationLineId, setActiveAllocationLineId] = useState<
    string | null
  >(null);

  const linesWithKeys = useMemo(() => {
    return lines.map((line, idx) => ({
      ...line,
      _stableKey: line.id || line._key || `temp-line-${idx}`,
    }));
  }, [lines]);

  const activeAllocationLine = useMemo(() => {
    if (!activeAllocationLineId) return null;
    return (
      linesWithKeys.find(
        (line) => line._stableKey === activeAllocationLineId,
      ) || null
    );
  }, [activeAllocationLineId, linesWithKeys]);

  const createEmptyLine = (
    lineType: "ITEM" | "GL_ACCOUNT" | "COMMENT",
  ): SalesQuoteLineUI => ({
    // _key: temp-sales-${Date.now()}-${Math.random() .toString(36) .slice(2)},
    line_type: lineType,

    item_id: undefined,
    item_code: undefined,
    item_name: undefined,

    gl_account_id: undefined,
    account_code: undefined,
    account_name: undefined,

    description: "",

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
    line_amount: 0,
    line_total: 0,

    warehouse_id: undefined,
    warehouse_code: undefined,
    warehouse_name: undefined,

    uom_id: undefined,
    uom_name: undefined,

    quantity_reserved: 0,
    quantity_shipped: 0,
    quantity_invoiced: 0,

    is_allocated: false,

    allocations: [],
    initialAllocations: [],
  });

  const calculateLine = (line: Partial<SalesQuoteLineUI>): SalesQuoteLineUI => {
    const qty = Number(line.quantity || 0);
    const price = Number(line.unit_price || 0);
    const original = qty * price;

    let discountAmount = 0;

    if (line.discount_type === "PERCENT") {
      discountAmount = original * (Number(line.discount_value || 0) / 100);
    } else {
      discountAmount = Number(line.discount_value || 0);
    }

    discountAmount = Math.min(
      Math.max(discountAmount, 0),
      Math.max(original, 0),
    );

    const net = Math.max(original - discountAmount, 0);

    const vat = net * (Number(line.vat_percent || 0) / 100);

    const gross = net + vat;

    const currentAllocations =
      line.allocations || line.initialAllocations || [];

    const totalAllocated = currentAllocations.reduce(
      (sum, allocation) => sum + Number(allocation.quantity || 0),
      0,
    );

    return {
      ...(line as SalesQuoteLineUI),

      original_amount: original,
      discount_amount: discountAmount,
      net_amount: net,
      vat_amount: vat,
      gross_amount: gross,

      line_amount: net,
      line_total: gross,

      allocations: currentAllocations,
      initialAllocations: line.initialAllocations || currentAllocations,

      is_allocated: qty > 0 && totalAllocated === qty,
    };
  };

  const addItemLine = () => {
    if (isReadonly) return;
    setItemModalOpen(true);
  };

  const addGLLine = () => {
    if (isReadonly) return;
    setGlModalOpen(true);
  };

  const buildItemLine = async (
    item: ItemLookupRecord,
  ): Promise<SalesQuoteLineUI> => {
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

        defaultWarehouse = warehouseData.data || null;
      }
    } catch (error) {
      console.error("Failed to fetch default warehouse:", error);
    }

    const vatBusinessGroupId = salesQuote.vat_business_posting_group_id || "";

    const vatProductGroupId = item.vat_product_group_id || "";

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

          calculatedVatPercent = Number(
            vatData.data?.vat_rate ?? vatData.data?.vat_percent ?? 0,
          );
        }
      } catch (error) {
        console.error("Error resolving VAT posting setup rate:", error);
      }
    }

    return calculateLine({
      ...createEmptyLine("ITEM"),

      line_type: "ITEM",

      item_id: item.id,
      item_code: item.item_code,
      item_name: item.name,

      description: item.description || item.name,

      unit_price: Number(item.standard_sales_price || 0),

      uom_id: item.base_uom_id,
      uom_name: item.base_uom_name,

      vat_percent: calculatedVatPercent,

      vat_business_posting_group_id: vatBusinessGroupId,

      vat_product_posting_group_id: vatProductGroupId,

      warehouse_id: defaultWarehouse?.id,

      warehouse_code: defaultWarehouse?.code,

      warehouse_name: defaultWarehouse?.name,

      quantity_reserved: 0,
      quantity_shipped: 0,
      quantity_invoiced: 0,

      allocations: [],
      initialAllocations: [],

      is_allocated: false,
    });
  };

  const handleMultipleItemSelect = async (items: ItemLookupRecord[]) => {
    if (!items.length) {
      setItemModalOpen(false);
      return;
    }
    try {
      const newLines = await Promise.all(
        items.map((item) => buildItemLine(item)),
      );

      setLines((previousLines) => [...previousLines, ...newLines]);

      setItemModalOpen(false);
    } catch (error) {
      console.error("Failed to add selected items:", error);
    }
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

    setLines((previousLines) => [...previousLines, ...newLines]);

    setGlModalOpen(false);
  };

  useEffect(() => {
    async function loadVatOptions() {
      try {
        const busGroupParam = salesQuote?.vat_business_posting_group_id
          ? `?vat_business_group_id=${salesQuote.vat_business_posting_group_id}`
          : "";

        const response = await fetch(`/api/lookups/vat-rates${busGroupParam}`);

        if (response.ok) {
          const json = await response.json();

          setVatOptions(json.data || []);
        } else {
          setVatOptions([]);
        }
      } catch (error) {
        console.error("Failed to load VAT options:", error);

        setVatOptions([]);
      }
    }

    loadVatOptions();
  }, [salesQuote?.vat_business_posting_group_id]);

  const handleVatChange = (index: number, selectedVatOptionId: string) => {
    const selectedOption = vatOptions.find(
      (option) => option.id === selectedVatOptionId,
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
    if (isReadonly) return;
    setLines(lines.filter((_, lineIndex) => lineIndex !== index));
  };

  const updateLine = <K extends keyof SalesQuoteLineUI>(
    index: number,
    field: K,
    value: SalesQuoteLineUI[K],
  ) => {
    const updated = [...lines];

    const targetLine = {
      ...updated[index],
      [field]: value,
    };

    if (field === "quantity") {
      targetLine.allocations = [];
      targetLine.initialAllocations = [];
      targetLine.is_allocated = false;
    }

    updated[index] = calculateLine(targetLine);

    setLines(updated);
  };

  const changeLineType = (
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

      uom_id: undefined,
      uom_name: undefined,

      allocations: [],
      initialAllocations: [],

      is_allocated: false,

      quantity: type === "COMMENT" ? 0 : Number(updated[index].quantity || 1),

      unit_price:
        type === "COMMENT" ? 0 : Number(updated[index].unit_price || 0),

      discount_value:
        type === "COMMENT" ? 0 : Number(updated[index].discount_value || 0),

      vat_percent:
        type === "COMMENT" ? 0 : Number(updated[index].vat_percent || 0),
    });

    setLines(updated);
  };

  const handleSaveAllocations = (
    allocationsData: PO_StockAllocationRecord[],
  ) => {
    if (!activeAllocationLineId) {
      return;
    }
    setLines((previousLines) =>
      previousLines.map((line, index) => {
        const lineKey = line.id || line._key || `temp-sales-line-${index}`;

        if (lineKey !== activeAllocationLineId) {
          return line;
        }

        const totalAllocated = allocationsData.reduce(
          (sum, allocation) => sum + Number(allocation.quantity || 0),
          0,
        );

        const lineQty = Number(line.quantity || 0);

        return {
          ...line,

          allocations: allocationsData,

          initialAllocations: allocationsData,

          is_allocated: lineQty > 0 && totalAllocated === lineQty,
        };
      }),
    );

    setIsAllocationModalOpen(false);

    setActiveAllocationLineId(null);
  };

  const handleDiscountTypeChange = (index: number, value: string) => {
    updateLine(index, "discount_type", value as "PERCENT" | "FIXED");
  };

  const totals = useMemo(() => {
    return lines.reduce(
      (accumulator, line) => {
        accumulator.original += Number(line.original_amount || 0);

        accumulator.discount += Number(line.discount_amount || 0);

        accumulator.net += Number(line.net_amount || 0);

        accumulator.vat += Number(line.vat_amount || 0);

        accumulator.gross += Number(line.gross_amount || 0);

        return accumulator;
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

  return (
    <div className="space-y-2 w-full text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 px-4">
          Sales Quote Lines
        </h3>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={addItemLine}
            variant="add_line"
            disabled={isReadonly}
          >
            Select Item
          </Button>

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
              <th className="p-2 w-[150px] overflow-hidden">Warehouse</th>
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
            {linesWithKeys.length === 0 && (
              <tr>
                <td colSpan={16} className="text-center p-8 text-gray-500">
                  No lines added
                </td>
              </tr>
            )}

            {linesWithKeys.map((line, index) => {
              const displayQty = Number(line.quantity || 0);
              const shippedQty = Number(line.quantity_shipped || 0);
              const invoicedQty = Number(line.quantity_invoiced || 0);
              const isLineFulfilled = shippedQty > 0;
              const isLineDisabled = isReadonly || isLineFulfilled;
              const displayUnitPrice = Number(line.unit_price || 0);
              const displayDiscountValue = Number(line.discount_value || 0);
              const displayOriginalAmount = Number(
                line.original_amount || displayQty * displayUnitPrice,
              );
              const displayDiscountAmount = Number(line.discount_amount || 0);
              const displayNetAmount = Number(line.net_amount || 0);
              const displayVATAmount = Number(line.vat_amount || 0);
              const displayGrossAmount = Number(line.gross_amount || 0);
              const displayVatPercent = Number(line.vat_percent || 0);

              const currentAllocations =
                line.allocations || line.initialAllocations || [];
              const totalAllocated = currentAllocations.reduce(
                (sum, allocation) => sum + Number(allocation.quantity || 0),
                0,
              );
              const isFullyAllocated =
                displayQty > 0 && totalAllocated === displayQty;
              const isPartiallyAllocated =
                totalAllocated > 0 && totalAllocated < displayQty;
              const isAllocationDisabled =
                line.line_type !== "ITEM" ||
                !line.item_id ||
                !line.warehouse_id ||
                displayQty <= 0;

              return (
                <tr
                  key={line._stableKey}
                  className={`border-b transition-colors ${
                    isLineFulfilled
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
                          title={line.account_name}
                          disabled={isLineDisabled}
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
                      type="text"
                      value={line.description || ""}
                      disabled={isLineDisabled}
                      onChange={(event) =>
                        updateLine(index, "description", event.target.value)
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1.5 w-full text-[11px] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>

                  <td className="p-2">
                    <NumericTextInput
                      value={displayQty}
                      allowDecimals={false}
                      disabled={isLineDisabled || line.line_type === "COMMENT"}
                      onChange={(value) => updateLine(index, "quantity", value)}
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

                              {line.reserved_quantity !== undefined &&
                                Number(line.reserved_quantity || 0) > 0 &&
                                ` - (${Number(line.reserved_quantity)})`}
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="p-2">
                    <NumericTextInput
                      value={displayUnitPrice}
                      allowDecimals={true}
                      decimalScale={2}
                      disabled={isLineDisabled}
                      onChange={(value) =>
                        updateLine(index, "unit_price", value)
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1.5 w-full text-right text-[11px] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>

                  <td className="p-2">
                    <select
                      value={line.discount_type || "PERCENT"}
                      disabled={isLineDisabled}
                      onChange={(event) =>
                        handleDiscountTypeChange(index, event.target.value)
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1.5 text-[11px] w-full disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                      onChange={(value) =>
                        updateLine(index, "discount_value", value)
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1.5 w-full text-[11px] text-right disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>

                  <td className="p-2">
                    <select
                      value={
                        vatOptions.find(
                          (option) =>
                            option.vat_product_group_id ===
                              line.vat_product_posting_group_id ||
                            option.id === line.vat_product_posting_group_id ||
                            option.vat_percent === displayVatPercent,
                        )?.id || ""
                      }
                      disabled={isLineDisabled || line.line_type === "COMMENT"}
                      onChange={(e) => handleVatChange(index, e.target.value)}
                      className="border dark:border-slate-700 dark:bg-slate-800 text-[11px] rounded p-1.5 w-full bg-white dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">0% (Exempt/Zero)</option>
                      {vatOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.code} ({option.vat_percent}
                          %)
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
                    {displayNetAmount.toFixed(2)}
                  </td>
                  <td className="p-2 text-right font-semibold text-[11px]">
                    {displayVATAmount.toFixed(2)}
                  </td>
                  <td className="p-2 text-right font-semibold text-[11px]">
                    {displayGrossAmount.toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {!isLineFulfilled ? (
                        <button
                          type="button"
                          disabled={isReadonly}
                          onClick={() => removeLine(index)}
                          className="text-red-600 hover:text-red-800 p-1 rounded font-medium bg-slate-100 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Remove line"
                        >
                          <Icon icon="lucide:x" className="w-4 h-4" />
                        </button>
                      ) : (
                        <span
                          className="text-[10px] text-slate-400 italic cursor-help"
                          title={`Line locked because ${shippedQty} item(s) have already been shipped.`}
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
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={handleMultipleItemSelect}
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
          if (warehouseIndex === null) {
            return;
          }

          const updated = [...lines];

          updated[warehouseIndex] = calculateLine({
            ...updated[warehouseIndex],

            warehouse_id: warehouse.id,
            warehouse_code: warehouse.code,
            warehouse_name: warehouse.name,

            allocations: undefined,
            initialAllocations: undefined,
            is_allocated: false,
          });

          setLines(updated);
          setWarehouseIndex(null);
        }}
      />
    </div>
  );
}

/* "use client";

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
            // className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            variant="add_line"
          >
            Add Line
          </Button>
        )}
      </div>

      <div className="border rounded overflow-auto bg-white dark:bg-slate-900">
        <table className="w-full text-xs min-w-[1300px] border-collapse table-fixed">
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
                  </select>
                </td>

                <td className="p-2">
                  {line.line_type === "ITEM" && (
                    <button
                      type="button"
                      disabled={isReadonly}
                      onClick={() => setItemIndex(index)}
                      className="border rounded px-2 py-1 text-left w-full bg-gray-50 hover:bg-gray-100 truncate dark:bg-slate-800"
                    >
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

                <td className="p-2 text-right font-mono font-medium">
                  {Number(line.total_amount || 0).toFixed(2)}
                </td>

                {!isReadonly && (
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
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
} */
