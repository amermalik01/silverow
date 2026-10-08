// app/components/setup/opening-balances/stock/types.ts

import type { ItemLookupRecord } from "@/app/components/shared/modals/ItemLookupModal";

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
