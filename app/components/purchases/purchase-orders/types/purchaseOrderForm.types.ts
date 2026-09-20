// types/purchaseOrderForm.types.ts

import { PurchaseOrderLineUI } from "@/types/purchase-order";

export type TabType =
  | "general"
  | "invoicing"
  | "shipping"
  | "attachments";

export type SupplierSelectionSource =
  | "general"
  | "invoicing"
  | "shipping_agent";

export type FetchLinesAPIResponse = {
  lines?: PurchaseOrderLineUI[];
  success?: boolean;
  error?: string;
};
