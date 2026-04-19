// lib/master/masterRegistry.ts

export const MASTER_API_MAP = {
  currency: "/api/setup/general/currencies",
  storage_type: "/api/setup/warehouse-storage-types",
  country: "/api/setup/master/countries",
} as const;

export type MasterType = keyof typeof MASTER_API_MAP;