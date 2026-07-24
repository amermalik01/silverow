// types/warehouse.ts

export type WarehouseType =
  | "DISTRIBUTION"
  | "STORE"
  | "TRANSIT"
  | "VIRTUAL"
  | "COLD_STORAGE"
  | (string & {});

export interface CreateWarehouseInput {
  company_id: string; // UUID
  name: string;
  type: WarehouseType;
  status?: number;
  is_default?: boolean;
  
  // Address
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;

  // Primary Contact
  contact_person?: string;
  job_title?: string;
  telephone?: string;
  direct_line?: string;
  mobile?: string;
  email?: string;
  fax?: string;
  e_dispatch_email?: boolean;

  // Storage & Costing
  warehouse_storage_type?: string;
  primary_location_id?: string | null;
  parent_location_id?: string | null;
  start_date?: string;
  unit_of_measure?: string;
  cost_frequency?: string;
  currency_id?: string | null;
  cost?: number | string;
  comments?: string;

  storage_type_id?: string | null;
}

export interface Warehouse {
  id: string;
  company_id: string;

  code: string;
  name: string;

  type: WarehouseType;
  status: number;
  is_default?: boolean;

  // Address
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;

  // Primary Contact
  contact_person?: string;
  job_title?: string;
  telephone?: string;
  direct_line?: string;
  mobile?: string;
  email?: string;
  fax?: string;
  e_dispatch_email?: boolean;

  // Storage & Costing
  warehouse_storage_type?: string;
  
  primary_location_id?: string | null;
  parent_location_id?: string | null;
  start_date?: string;
  unit_of_measure?: string;
  cost_frequency?: string;
  currency_id?: string | null;
  cost?: number | string;
  comments?: string;

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
  parent_id?: string | null;
  title: string;
  code?: string;
  // type?: string;
  type: WarehouseLocationType;
  is_primary: boolean;
  city?: string;
  capacity?: number | null;
  start_date?: string;
  unit_of_measure?: string;
  cost_frequency?: string;
  currency?: string;
  cost?: number | string;
  comments?: string;
};

export type WarehouseContactType =
  | "MANAGER"
  | "SUPERVISOR"
  | "DELIVERY"
  | "BILLING";

export type WarehouseContact = {
  id: string;
  warehouse_id: string;
  name: string;
  job_title?: string;
  location_name?: string;
  direct_line?: string;
  mobile?: string;
  telephone?: string;
  fax?: string;
  email?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  // type?: string;
  type: WarehouseContactType;
  status?: number;
};

