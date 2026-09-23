// app/components/sales/returns/SalesReturnLines.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";

import { SalesReturn, SalesReturnLineUI } from "@/types/sales-return";

import ItemLookupModal, {
  ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

import WarehouseLookupModal, {
  WarehouseLookupRecord,
} from "@/app/components/shared/modals/WarehouseLookupModal";

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
  lines: SalesReturnLineUI[];
  setLines: React.Dispatch<React.SetStateAction<SalesReturnLineUI[]>>;
  isReadonly?: boolean;
  salesReturn: Partial<SalesReturn>;
  refreshLines?: () => Promise<void>;
};

export default function SalesReturnLines({
  lines,
  setLines,
  isReadonly = false,
  salesReturn,
  refreshLines,
}: Props) {
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [glModalOpen, setGlModalOpen] = useState(false);

  const [itemIndex, setItemIndex] = useState<number | null>(null);
  const [glIndex, setGlIndex] = useState<number | null>(null);

  const [warehouseIndex, setWarehouseIndex] = useState<number | null>(null);
  const [vatOptions, setVatOptions] = useState<VatPostingOption[]>([]);

  const linesWithKeys = useMemo(() => {
    return lines.map((line, idx) => ({
      ...line,
      _stableKey: line.id || line._key || `temp-return-line-${idx}`,
    }));
  }, [lines]);

  const createEmptyLine = (
    lineType: "ITEM" | "GL_ACCOUNT" | "COMMENT",
  ): SalesReturnLineUI => ({
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

    returned_quantity: 0,
    // quantity_credited: 0,
  });

  const calculateLine = (
    line: Partial<SalesReturnLineUI>,
  ): SalesReturnLineUI => {
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

    return {
      ...(line as SalesReturnLineUI),

      original_amount: original,
      discount_amount: discountAmount,
      net_amount: net,
      vat_amount: vat,
      gross_amount: gross,

      line_amount: net,
      line_total: gross,
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
  ): Promise<SalesReturnLineUI> => {
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

    const vatBusinessGroupId = salesReturn.vat_business_posting_group_id || "";
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

      returned_quantity: 0,
      // quantity_credited: 0,
    });
  };

  const handleMultipleItemSelect = async (items: ItemLookupRecord[]) => {
    if (!items.length) {
      setItemModalOpen(false);
      return;
    }

    try {
      if (itemIndex !== null) {
        // Single row item selection/replacement
        const updatedLine = await buildItemLine(items[0]);
        setLines((previousLines) => {
          const updated = [...previousLines];
          updated[itemIndex] = updatedLine;
          return updated;
        });
        setItemIndex(null);
      } else {
        // Bulk item insertion
        const newLines = await Promise.all(
          items.map((item) => buildItemLine(item)),
        );
        setLines((previousLines) => [...previousLines, ...newLines]);
      }
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

    if (glIndex !== null) {
      // Single row GL selection/replacement
      const account = accounts[0];
      setLines((previousLines) => {
        const updated = [...previousLines];
        updated[glIndex] = calculateLine({
          ...updated[glIndex],
          gl_account_id: account.id,
          account_code: account.code,
          account_name: account.name,
          description: account.name,
        });
        return updated;
      });
      setGlIndex(null);
    } else {
      // Bulk GL insertion
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
    }
    setGlModalOpen(false);
  };

  useEffect(() => {
    async function loadVatOptions() {
      try {
        const busGroupParam = salesReturn?.vat_business_posting_group_id
          ? `?vat_business_group_id=${salesReturn.vat_business_posting_group_id}`
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
  }, [salesReturn?.vat_business_posting_group_id]);

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

  const updateLine = <K extends keyof SalesReturnLineUI>(
    index: number,
    field: K,
    value: SalesReturnLineUI[K],
  ) => {
    const updated = [...lines];

    const targetLine = {
      ...updated[index],
      [field]: value,
    };

    updated[index] = calculateLine(targetLine);
    setLines(updated);
  };

  const handleDiscountTypeChange = (index: number, value: string) => {
    updateLine(index, "discount_type", value as "PERCENT" | "FIXED");
  };

  return (
    <div className="space-y-2 w-full text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 px-4">
          Credit Note Lines
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

      <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
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
                <td colSpan={15} className="text-center p-8 text-gray-500">
                  No lines added
                </td>
              </tr>
            )}

            {linesWithKeys.map((line, index) => {
              const displayQty = Number(line.quantity || 0);
              const receivedQty = Number(line.returned_quantity || 0);
              // const creditedQty = Number(line.quantity_credited || 0);
              const isLineFulfilled = receivedQty > 0; //  || creditedQty > 0
              const isLineDisabled = isReadonly || isLineFulfilled;
              const displayUnitPrice = Number(line.unit_price || 0);
              const displayDiscountValue = Number(line.discount_value || 0);
              const displayOriginalAmount = Number(
                line.original_amount || displayQty * displayUnitPrice,
              );
              const displayDiscountAmount = Number(line.discount_amount || 0);
              const displayNetAmount = Number(line.net_amount || 0);
              const displayVATAmount = Number(line.vat_amount || 0);
              const displayVatPercent = Number(line.vat_percent || 0);

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
                          onClick={() => {
                            setItemIndex(index);
                            setItemModalOpen(true);
                          }}
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
                          onClick={() => {
                            setGlIndex(index);
                            setGlModalOpen(true);
                          }}
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
                          {option.code} ({option.vat_percent}%)
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
                          title={`Line locked because return item(s) have already been received or credited.`}
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
        onClose={() => {
          setItemModalOpen(false);
          setItemIndex(null);
        }}
        multiple={itemIndex === null}
        onSelect={(item) => handleMultipleItemSelect([item])}
        onSelectMultiple={handleMultipleItemSelect}
      />

      <GLAccountLookupModal
        open={glModalOpen}
        onClose={() => {
          setGlModalOpen(false);
          setGlIndex(null);
        }}
        multiple={glIndex === null}
        onSelect={(account) => handleMultipleGLSelect([account])}
        onSelectMultiple={handleMultipleGLSelect}
      />

      <WarehouseLookupModal
        open={warehouseIndex !== null}
        onClose={() => setWarehouseIndex(null)}
        onSelect={(warehouse: WarehouseLookupRecord) => {
          if (warehouseIndex === null) return;

          const updated = [...lines];
          updated[warehouseIndex] = calculateLine({
            ...updated[warehouseIndex],
            warehouse_id: warehouse.id,
            warehouse_code: warehouse.code,
            warehouse_name: warehouse.name,
          });

          setLines(updated);
          setWarehouseIndex(null);
        }}
      />
    </div>
  );
}
