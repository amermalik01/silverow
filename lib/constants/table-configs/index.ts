// lib/constants/table-configs/index.ts

import { ColumnConfig } from "@/types/table";
import { purchaseOrdersConfig } from "./purchase-orders";
import { suppliersConfig } from "./suppliers";
import { purchaseInvoicesConfig } from "./purchase-invoices";

export const DEFAULT_CONFIGS: Record<string, ColumnConfig[]> = {
  purchase_orders: purchaseOrdersConfig,
  purchase_invoices: purchaseInvoicesConfig,
  suppliers: suppliersConfig,
};

export function getDefaultTableConfig(moduleKey: string): ColumnConfig[] {
  return DEFAULT_CONFIGS[moduleKey] || [];
}
