// types/warehouse.ts

export interface CreateWarehouseInput {
  company_id: string; // UUID
  // code: string;
  name: string;
  type: "DISTRIBUTION" | "STORE" | "TRANSIT" | "COLD_STORAGE";
  status?: number;
  currency_id?: string | null;
  storage_type_id?: string | null;
}

export interface Warehouse {
  id: string;
  company_id: string;

  code: string;
  name: string;

  type: "DISTRIBUTION" | "STORE" | "TRANSIT" | "COLD_STORAGE";
  status: number;

  primary_location_id: string | null;

  currency_id?: string | null;
  storage_type_id?: string | null;

  created_at: string;
  updated_at: string;
}

export type WarehouseLocationType =
  | "WAREHOUSE"
  | "ZONE"
  | "AISLE"
  | "RACK"
  | "SHELF"
  | "BIN"
  | "DEPOT";

export type WarehouseLocation = {
  id: string;
  warehouse_id: string;

  parent_id: string | null;

  type: WarehouseLocationType;

  title: string;
  code?: string;
  city?: string;
  capacity?: string;

  is_primary: boolean;

  status: number;

  created_at: string;
  updated_at: string;
};

export type WarehouseContactType =
  | "MANAGER"
  | "SUPERVISOR"
  | "DELIVERY"
  | "BILLING";

export interface WarehouseContact {
  id: string;
  warehouse_id: string;
  company_id: string;

  name: string;
  job_title?: string;

  email?: string;
  phone?: string;
  mobile?: string;

  is_primary: boolean;

  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  postcode?: string;
  country_id?: number;

  type: WarehouseContactType;

  status: number;

  created_at: string;
  updated_at: string;
}
