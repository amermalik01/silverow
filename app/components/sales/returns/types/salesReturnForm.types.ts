// /app/components/sales/returns/types/salesReturnForm.types.ts

import { SalesReturnLineUI } from "@/types/sales-return";

export type TabType =
  | "general"
  | "invoicing"
  | "shipping"
  | "attachments";

export type CustomerSelectionSource =
  | "general"
  | "invoicing"
  | "shipping_agent";

export type FetchLinesAPIResponse = {
  lines?: SalesReturnLineUI[];
  success?: boolean;
  error?: string;
};
