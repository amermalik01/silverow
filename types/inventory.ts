// types/inventory.ts

/* ---------------------------
   CATEGORY
---------------------------- */

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

/* ---------------------------
   BRAND
---------------------------- */

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

/* ---------------------------
   UOM (UNIT OF MEASURE)
---------------------------- */

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

/* ---------------------------
   COMMON MASTER TYPES
---------------------------- */

export type MasterStatus = 1 | 2;
// 1 = Active
// 2 = Inactive
