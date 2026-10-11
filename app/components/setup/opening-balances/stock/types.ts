// app/components/setup/opening-balances/stock/types.ts


export type StockOpeningBalanceLineRow = {
  _stableKey: string;
  id?: string;

  posting_date: string;

  item_id: string;
  item_no: string;
  item_description: string;
  uom: string;

  production_date?: string;
  date_received?: string;
  use_by_date?: string;

  consignment_no?: string;
  ref_no?: string;
  batch_no?: string;

  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;

  location_id: string;
  location_name: string;

  quantity: number;
  unit_price: number;
  amount: number;

  // Set by the server after posting.
  posted?: boolean;
  posted_at?: string | null;
};

export type WarehouseOption = {
  id: string;
  name: string;
  code?: string;
};

export type LocationOption = {
  id: string;
  title: string;
  warehouse_id: string;
};

export type StockOpeningBalanceField =
  keyof StockOpeningBalanceLineRow;

export type StockOpeningBalanceFieldValue =
  StockOpeningBalanceLineRow[StockOpeningBalanceField];

export type StockOpeningBalanceApiResponse = {
  data?: unknown;
  error?: string;
  message?: string;
};