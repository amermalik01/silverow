// app/components/setup/opening-balances/stock/constants.ts

import type { ItemLookupRecord } from "@/app/components/shared/modals/ItemLookupModal";

import type { StockOpeningBalanceLineRow, WarehouseOption } from "./types";

export function createStableKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `stock-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
}

export function calculateStockAmount(
  quantity: number,
  unitPrice: number,
): number {
  return Number((Number(quantity || 0) * Number(unitPrice || 0)).toFixed(2));
}

export function createStockOpeningBalanceRow(
  item: ItemLookupRecord,
  warehouses: WarehouseOption[],
): StockOpeningBalanceLineRow {
  const warehouse = warehouses[0];

  const unitPrice = Number(
    item.standard_cost ?? item.standard_sales_price ?? 0,
  );

  return {
    _stableKey: createStableKey(),

    posting_date: new Date().toISOString().slice(0, 10),

    item_id: item.id,
    item_no: item.item_code || "",
    item_description: item.description || item.name || "",
    uom: item.base_uom_name || "Pcs",

    production_date: "",
    date_received: "",
    use_by_date: "",

    consignment_no: "",
    ref_no: "",
    batch_no: "",

    warehouse_id: warehouse?.id || "",
    warehouse_code: warehouse?.code || "",
    warehouse_name: warehouse?.name || "",

    location_id: "",
    location_name: "",

    quantity: 1,
    unit_price: unitPrice,
    amount: calculateStockAmount(1, unitPrice),

    posted: false,
    posted_at: null,
  };
}
