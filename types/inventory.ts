// types/inventory.ts

export type ItemListRow = {
  id: string;
  item_code: string;
  barcode: string | null;
  name: string;
  category_name: string | null;
  brand_name: string | null;
  item_type: number;
  item_type_label: string;
  status: number;
  status_label: string;
};

export type ItemLookupOption = {
  id: string;
  name: string;
};

export type ItemFormData = {
  item_code: string;
  barcode: string;
  name: string;
  description: string;
  item_type: number;
  status: number;
  category_id: string;
  brand_id: string;
  base_uom_id: string;
  purchase_uom_id: string;
  sales_uom_id: string;
  stock_tracking: boolean;
  reorder_qty: string;
  standard_sales_price: string;
  standard_cost: string;
  costing_method: number;

  // GL Accounting Fields
  inventory_posting_group_id?: string;
  inventory_gl_id?: string;
  cogs_gl_id?: string;
  sales_gl_id?: string;
  purchase_gl_id?: string;

};

export type Category = {
  id: string;
  code: string;
  code_prefix: string;
  name: string;
  description?: string;
  parent_id?: string | null;
  status: number;
  created_at?: string;
  updated_at?: string;
};

export type CategoryOption = {
  id: string;
  name: string;
};

export type Brand = {
  id: string;
  code: string;
  code_prefix: string;
  name: string;
  status: number;
  created_at?: string;
  updated_at?: string;
};

export type BrandForm = {
  code: string;
  code_prefix: string;
  name: string;
  status: number;
};

export type BrandOption = {
  id: string;
  name: string;
};

export type UOMType = 1 | 2 | 3 | 4;
// 1 = Quantity
// 2 = Weight
// 3 = Volume
// 4 = Length

export type UOM = {
  id: string;
  code: string;
  name: string;
  uom_type: UOMType;
  decimal_places: number;
  status: number;
  created_at?: string;
  updated_at?: string;
};

export type UOMFormData = {
  code: string;
  name: string;
  uom_type: number;
  decimal_places: number;
  status: number;
};

export type UOMOption = {
  id: string;
  name: string;
};

export type ItemUOM = {
  id: string;

  uom_id: string;
  uom_name: string;

  is_base: boolean;
  conversion_factor: string;
  barcode: string | null;
  weight: string | null;
  volume: string | null;
};

export type UOMForm = {
  uom_id: string;
  conversion_factor: string;
  barcode: string;
  weight: string;
  volume: string;
  is_base: boolean;
};

export type ItemWarehouseDraft = {
  id?: string;
  warehouse_id: string;
  storage_location_id?: string;
  unit_of_measure?: string;
  cost_frequency?: string;
  currency?: string;
  cost?: number | string;
  is_default?: boolean;
  status?: number; // 1 = Active, 0 = Inactive
  start_date?: string;
  comments?: string;
};

export type WarehouseOption = {
  id: string;
  code: string;
  name: string;
};

export type StorageLocationOption = {
  id: string;
  warehouse_id: string;
  title: string;
  cost_frequency?: string;
  unit_of_measure?: string;
  currency?: string;
  cost?: number;
};

export type WarehouseStock = {
  id: string;

  warehouse_id: string;
  warehouse_name: string;

  location_id: string | null;
  location_name: string | null;

  quantity: string;
  reserved_quantity: string;
  available_quantity: string;

  average_cost: string | null;

  batch_no: string | null;
  serial_no: string | null;
  consignment_no: string | null;

  last_movement_at: string | null;
};

export type LocationOption = {
  id: string;
  name: string;
  warehouse_id: string;
};

export type StockForm = {
  warehouse_id: string;
  location_id: string;
  quantity: string;
  reserved_quantity: string;
  unit_cost: string;
  batch_no: string;
  serial_no: string;
  expiry_date: string;
};

/* ---------------------------
   COMMON MASTER TYPES
---------------------------- */

export type MasterStatus = 1 | 2;
// 1 = Active
// 2 = Inactive
