// types/sales-line.ts

export type SalesLineType =
  | "ITEM"
  | "GL_ACCOUNT"
  | "COMMENT";

export type SalesLine = {
  id?: string;
  line_no?: number;
  line_type: SalesLineType;
  item_id?: string;
  item_code?: string;
  item_name?: string;

  gl_account_id?: string;
  account_code?: string;
  account_name?: string;

  warehouse_id?: string;
  warehouse_code?: string;
  warehouse_name?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_type?: "PERCENT" | "FIXED";
  discount_value?: number;
  vat_percent?: number;
  original_amount?: number;
  discount_amount?: number;
  net_amount?: number;
  vat_amount?: number;
  gross_amount?: number;
  line_total?: number;
  uom_id?: string;
  uom_name?: string;
  available_stock?: number;
  reserved_quantity?: number;
  sales_gl_id?: string;
  inventory_gl_id?: string;
  sales_quote_line_id?: string;
};