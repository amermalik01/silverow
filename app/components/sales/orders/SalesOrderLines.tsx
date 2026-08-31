// /app/components/sales/orders/SalesOrderLines.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  SalesOrder,
  SalesOrderLine,
  SalesOrderLineUI,
} from "@/types/sales-order";

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

type VatPostingOption = {
  id: string;
  code: string;
  description?: string;
  vat_percent: number;
  vat_product_group_id?: string;
};

type Props = {
  lines: SalesOrderLineUI[];
  setLines: React.Dispatch<React.SetStateAction<SalesOrderLineUI[]>>;
  isReadonly?: boolean;

  salesOrder: Partial<SalesOrder>;
  refreshLines?: () => Promise<void>;
};

export default function SalesOrderLines({
  lines,
  setLines,
  isReadonly = false,
  salesOrder,
  refreshLines,
}: Props) {
  const [itemIndex, setItemIndex] = useState<number | null>(null);
  const [glIndex, setGlIndex] = useState<number | null>(null);
  const [warehouseIndex, setWarehouseIndex] = useState<number | null>(null);

  const [vatOptions, setVatOptions] = useState<VatPostingOption[]>([]);

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
        quantity_shipped: 0,
        quantity_invoiced: 0,
        // shipped_quantity: 0,
        // invoiced_quantity: 0,
      },
    ]);
  };

  useEffect(() => {
    async function loadVatOptions() {
      try {
        const busGroupParam = salesOrder?.vat_business_posting_group_id
          ? `?vat_business_group_id=${salesOrder.vat_business_posting_group_id}`
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
  }, [salesOrder?.vat_business_posting_group_id]);

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
    line: Partial<SalesOrderLineUI>,
  ): SalesOrderLine => {
    const qty = Number(line.quantity || 0);
    const price = Number(line.unit_price || 0);
    const original = qty * price;
    let discountAmount = 0;

    if (line.discount_type === "PERCENT") {
      discountAmount = original * (Number(line.discount_value || 0) / 100);
    } else {
      discountAmount = Number(line.discount_value || 0);
    }

    // Net Amount after Discount
    const net = original - discountAmount;
    // VAT calculated on Net Amount (after discount)
    const vat = net * (Number(line.vat_percent || 0) / 100);
    const gross = net + vat;

    return {
      ...(line as SalesOrderLineUI),
      original_amount: original,
      discount_amount: discountAmount,
      net_amount: net,
      vat_amount: vat,
      gross_amount: gross,      
      line_total: gross,
    };
  };

  const updateLine = <K extends keyof SalesOrderLineUI>(
    index: number,
    field: K,
    value: SalesOrderLineUI[K],
  ) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
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
    };

    setLines(updated);
  };

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
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 px-4">
          Sales Order Lines
        </h3>

        <div className="flex items-center gap-2">
          {!isReadonly && (
            <Button
              type="button"
              onClick={addLine}
              // className="bg-blue-600 hover:bg-blue-700 text-white rounded"
              variant="add_line"
            >
              Add Line
            </Button>
          )}
        </div>
      </div>

      <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs border-collapse table-fixed min-w-[1300px] p-2">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 capitalize font-semibold text-slate-600 dark:text-slate-400">
              <th className="p-2 w-[100px]">Type</th>
              <th className="p-2 w-[120px]">No.</th>
              <th className="p-2 w-[180px]">Description</th>
              <th className="p-2 text-right w-[70px]">Qty</th>
              <th className="p-2 w-[60px]">U.O.M</th>
              <th className="p-2 w-[150px]">Warehouse</th>
              <th className="p-2 text-right w-[90px]">Unit Price</th>
              <th className="p-2 w-[80px]">Disc Type</th>
              <th className="p-2 text-right w-[80px]">Discount</th>
              <th className="p-2 text-right w-[90px]">VAT Rate</th>
              <th className="p-2 text-right w-[95px]">Original Amt</th>
              <th className="p-2 text-right w-[95px]">Disc Amt</th>
              <th className="p-2 text-right w-[95px]">Net</th>
              <th className="p-2 text-right w-[100px]">Gross</th>
              {!isReadonly && (
                <th className="p-2 text-center w-[90px]">Action</th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {lines.length === 0 && (
              <tr>
                <td colSpan={14} className="text-center p-8 text-gray-500">
                  No lines added
                </td>
              </tr>
            )}

            {lines.map((line, index) => {
              const displayQty = Number(line.quantity || 0);
              const shippedQty = Number(line.quantity_shipped || 0);
              const isLineFulfilled = shippedQty > 0;
              const isLineDisabled = isReadonly || isLineFulfilled;

              const displayUnitPrice = Number(line.unit_price || 0);
              const displayDiscountValue = Number(line.discount_value || 0);
              const displayDiscountAmount = Number(line.discount_amount || 0);
              const displayVatPercent = Number(line.vat_percent || 0);

              return (
                <tr
                  key={index}
                  className={`border-b transition-colors ${
                    isLineFulfilled
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
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1.5 w-full  disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="ITEM">Item</option>
                      <option value="GL_ACCOUNT">G/L</option>
                    </select>
                  </td>

                  <td className="p-2">
                    {line.line_type === "ITEM" && (
                      <button
                        type="button"
                        disabled={isLineDisabled}
                        title={line.item_name}
                        onClick={() => setItemIndex(index)}
                        className="border dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-left w-full truncate disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {line.item_code || "Select Item"}
                      </button>
                    )}

                    {line.line_type === "GL_ACCOUNT" && (
                      <button
                        type="button"
                        title={line.account_name}
                        disabled={isLineDisabled}
                        onClick={() => setGlIndex(index)}
                        className="border dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-left w-full truncate disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {line.account_code || "Select GL"}
                      </button>
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
                    <input
                      type="number"
                      value={displayQty}
                      disabled={isLineDisabled || line.line_type === "COMMENT"}
                      onChange={(e) =>
                        updateLine(index, "quantity", Number(e.target.value))
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </td>

                  <td className="p-2 text-gray-500">
                    {line.uom_name || "-"}
                  </td>

                  <td className="p-2">
                    {line.line_type === "ITEM" && (
                      <div className="space-y-1">
                        <button
                          type="button"
                          disabled={isLineDisabled}
                          onClick={() => setWarehouseIndex(index)}
                          className="w-full border dark:border-slate-700 rounded px-2 py-1.5 text-xs bg-white dark:bg-slate-800 flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <span className="truncate text-left">
                            {line.warehouse_code || "Select"}
                          </span>
                        </button>

                        {!line.warehouse_id && (
                          <div className="text-red-500 text-[10px]">
                            Required
                          </div>
                        )}

                        {/* {line.available_stock !== undefined &&
                          (line.quantity || 0) > line.available_stock && (
                            <div className="text-red-600 text-[10px] font-medium">
                              Insufficient stock
                            </div>
                          )} */}
                      </div>
                    )}
                  </td>

                  <td className="p-2">
                    <input
                      type="number"
                      value={displayUnitPrice}
                      disabled={isLineDisabled}
                      onChange={(e) =>
                        updateLine(index, "unit_price", Number(e.target.value))
                      }
                      className="border dark:border-slate-700 dark:bg-slate-800 rounded p-1 w-full text-right disabled:opacity-60 disabled:cursor-not-allowed"
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
                    <input
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
                      className="border dark:border-slate-700 dark:bg-slate-800 text-xs rounded p-1.5 w-full bg-white dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">0% (Exempt/Zero)</option>
                      {vatOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.code} ({opt.vat_percent}%)
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-2 text-right font-medium ">
                    {displayDiscountAmount.toFixed(2)}
                  </td>

                  <td className="p-2 text-right font-medium">
                    {Number(line.net_amount || 0).toFixed(2)}
                  </td>

                  <td className="p-2 text-right font-semibold">
                    {Number(line.gross_amount || 0).toFixed(2)}
                  </td>

                  {!isReadonly && (
                    <td className="p-2 text-center">
                      {!isLineFulfilled && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="text-red-600 hover:text-red-800 p-1 rounded font-medium bg-slate-100 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                        >
                          <Icon icon="lucide:x" className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
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
            item_name: item.name,
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
        onSelect={(wh: WarehouseLookupRecord) => {
          if (warehouseIndex === null) return;
          const updated = [...lines];
          updated[warehouseIndex] = {
            ...updated[warehouseIndex],
            warehouse_id: wh.id,
            warehouse_code: wh.code,
            warehouse_name: wh.name,
          };
          setLines(updated);
          setWarehouseIndex(null);
        }}
      />
    </div>
  );
}

/* "use client";

import { useMemo, useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import {
  SalesOrder,
  SalesOrderLine,
  SalesOrderLineUI,
} from "@/types/sales-order";

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

type Props = {
  lines: SalesOrderLineUI[];
  setLines: React.Dispatch<React.SetStateAction<SalesOrderLineUI[]>>;
  isReadonly?: boolean;

  salesOrder: Partial<SalesOrder>;
  refreshLines?: () => Promise<void>;
  // onTotalsChange?: (totals: {
  //   subtotal: number;
  //   tax: number;
  //   total: number;
  // }) => void;
};

export default function SalesOrderLines({
  lines,
  setLines,
  isReadonly = false,
  salesOrder,
  refreshLines,
  // onTotalsChange,
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

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

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
      ...line,
      original_amount: original,
      discount_amount: discount,
      net_amount: net,
      vat_amount: tax,
      gross_amount: total,
      line_total: total,
    } as SalesOrderLineUI;
  };

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

  const changeLineType = (
    index: number,
    type: "ITEM" | "GL_ACCOUNT" | "COMMENT",
  ) => {
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      line_type: type,
      quantity: type === "COMMENT" ? 0 : 1,
      unit_price: 0,
      discount_type: "PERCENT",
      discount_value: 0,
      vat_percent: 0,
      original_amount: 0,
      discount_amount: 0,
      net_amount: 0,
      vat_amount: 0,
      gross_amount: 0,
      item_id: undefined,
      item_code: undefined,
      gl_account_id: undefined,
      account_code: undefined,
      warehouse_id: undefined,
      warehouse_code: undefined,
      warehouse_name: undefined,
    };
    setLines(updated);
  };

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

  // useEffect(() => {
  //   if (onTotalsChange) {
  //     onTotalsChange({
  //       subtotal: totals.net,
  //       tax: totals.tax,
  //       total: totals.total,
  //     });
  //   }
  // }, [totals, onTotalsChange]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-base dark:text-white">
          Sales Order Lines
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

      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1400px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 capitalize font-semibold text-slate-600 dark:text-slate-400">
              <tr>
                <th className="p-2 w-28">Type</th>
                <th className="p-2 w-44">Item / GL Account</th>
                <th className="p-2">Description</th>
                <th className="p-2 w-28">Warehouse</th>
                <th className="p-2 w-20 text-right">Qty</th>
                <th className="p-2 w-28 text-right">Unit Price</th>
                <th className="p-2 w-24">Disc Type</th>
                <th className="p-2 w-24 text-right">Discount</th>
                <th className="p-2 w-20 text-right">Tax %</th>
                <th className="p-2 w-28 text-right">Total</th>
                {!isReadonly && (
                  <th className="p-2 w-20 text-center">Action</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="p-8 text-center text-gray-400 dark:text-gray-500"
                  >
                    No lines added yet. Click Add Line to get started.
                  </td>
                </tr>
              ) : (
                lines.map((line, index) => (
                  <tr
                    key={index}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
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
                        className="border dark:border-slate-700 rounded p-1.5 w-full bg-transparent dark:bg-slate-800 text-black dark:text-white"
                      >
                        <option value="ITEM">Item</option>
                        <option value="GL_ACCOUNT">GL Account</option>
       
                      </select>
                    </td>


                    <td className="p-2">
                      {line.line_type === "ITEM" && (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => !isReadonly && setItemIndex(index)}
                            disabled={isReadonly}
                            className="border dark:border-slate-700 rounded px-3 py-1.5 w-full text-left bg-white dark:bg-slate-800 text-xs truncate text-black dark:text-white"
                          >
                            {line.item_code
                              ? `📦 ${line.item_code}`
                              : "🔍 Select Item"}
                          </button>
                        </div>
                      )}

                      {line.line_type === "GL_ACCOUNT" && (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => !isReadonly && setGlIndex(index)}
                            disabled={isReadonly}
                            className="border dark:border-slate-700 rounded px-3 py-1.5 w-full text-left bg-white dark:bg-slate-800 text-xs truncate text-black dark:text-white"
                          >
                            {line.account_code
                              ? `💳 ${line.account_code}`
                              : "🔍 Select GL"}
                          </button>
                        </div>
                      )}

                      {line.line_type === "COMMENT" && (
                        <span className="text-xs text-gray-400 px-2 block">
                          N/A
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
                        placeholder={
                          line.line_type === "COMMENT"
                            ? "Enter narrative notes..."
                            : "Description"
                        }
                        className="border dark:border-slate-700 rounded p-1.5 w-full bg-transparent dark:bg-slate-800 text-black dark:text-white"
                      />
                    </td>


                    <td className="p-2">
                      {line.line_type === "ITEM" ? (
                        <div className="space-y-1">
                          <button
                            type="button"
                            disabled={isReadonly}
                            onClick={() => setWarehouseIndex(index)}
                            className="border dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-gray-50 w-full text-left text-xs truncate"
                          >
                            {line.warehouse_code || "Select Whse"}
                          </button>

                          {!line.warehouse_id && (
                            <div className="text-red-500 text-[10px]">
                              Required
                            </div>
                          )}

                          {line.available_stock !== undefined &&
                            (line.quantity || 0) > line.available_stock && (
                              <div className="text-red-600 text-[10px] font-medium">
                                Insufficient stock
                              </div>
                            )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 px-2 block">
                          -
                        </span>
                      )}
                    </td>

  
                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isReadonly || line.line_type === "COMMENT"}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "quantity",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="border dark:border-slate-700 rounded p-1.5 w-full text-right bg-transparent text-black dark:text-white disabled:opacity-40"
                      />
                    </td>


                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isReadonly || line.line_type === "COMMENT"}
                        value={line.unit_price}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "unit_price",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="border dark:border-slate-700 rounded p-1.5 w-full text-right bg-transparent text-black dark:text-white disabled:opacity-40"
                      />
                    </td>


                    <td className="p-2">
                      <select
                        value={line.discount_type || "PERCENT"}
                        disabled={isReadonly || line.line_type === "COMMENT"}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "discount_type",
                            e.target.value as "PERCENT" | "FIXED",
                          )
                        }
                        className="border dark:border-slate-700 rounded p-1.5 w-full bg-transparent dark:bg-slate-800 text-black dark:text-white disabled:opacity-40"
                      >
                        <option value="PERCENT">%</option>
                        <option value="FIXED">Fixed</option>
                      </select>
                    </td>


                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isReadonly || line.line_type === "COMMENT"}
                        value={line.discount_value}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "discount_value",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="border dark:border-slate-700 rounded p-1.5 w-full text-right bg-transparent text-black dark:text-white disabled:opacity-40"
                      />
                    </td>


                    <td className="p-2">
                      <input
                        type="number"
                        disabled={isReadonly || line.line_type === "COMMENT"}
                        value={line.vat_percent}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "vat_percent",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="border dark:border-slate-700 rounded p-1.5 w-full text-right bg-transparent text-black dark:text-white disabled:opacity-40"
                      />
                    </td>


                    <td className="p-2 text-right font-semibold text-slate-700 dark:text-slate-200">
                      {Number(line.gross_amount || 0).toFixed(2)}
                    </td>


                    {!isReadonly && (
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          // className="text-red-500 hover:text-red-700 font-medium text-xs transition"
                          className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                        >
                          <Icon
                            icon="tabler:external-link"
                            className="w-4 h-4"
                          />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>


            <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-700 dark:text-slate-200 border-t border-slate-200 dark:border-slate-800">
              <tr>
                <td
                  colSpan={9}
                  className="text-right p-3 capitalize tracking-wider text-slate-500"
                >
                  Total
                </td>
                <td className="p-3 text-right font-bold text-xs">
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

        <WarehouseLookupModal
          open={warehouseIndex !== null}
          onClose={() => setWarehouseIndex(null)}
          onSelect={(wh: WarehouseLookupRecord) => {
            if (warehouseIndex === null) return;
            const updated = [...lines];
            updated[warehouseIndex] = {
              ...updated[warehouseIndex],
              warehouse_id: wh.id,
              warehouse_code: wh.code,
              warehouse_name: wh.name,
            };
            setLines(updated);
            setWarehouseIndex(null);
          }}
        />
      </div>
    </div>
  );
}
 */