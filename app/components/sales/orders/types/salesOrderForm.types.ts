// app/components/sales/orders/types/salesOrderForm.types.ts

import { SalesOrderLineUI } from "@/types/sales-order";

export type TabType =
  | "general"
  | "invoicing"
  | "shipping"
  | "margin"
  | "attachments";

export type CustomerSelectionSource =
  | "general"
  | "invoicing"
  | "shipping_agent";

export type FetchLinesAPIResponse = {
  lines?: SalesOrderLineUI[];
  success?: boolean;
  error?: string;
};

