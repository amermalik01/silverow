// types/sites.ts


export type SiteStatus = 0 | 1;

export type MeterType =
  | "IMPORT"
  | "EXPORT"
  | "IMPORT_EXPORT"
  | "GENERATION"
  | "OTHER";

export type BessFunction =
  | "TRADING"
  | "UPS"
  | "PEAK_SHAVING"
  | "BACKUP"
  | "OTHER";

export type PaymentFrequency =
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUALLY"
  | "CUSTOM";

export type PaymentStatus =
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type ServiceStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type ServiceType =
  | "PREVENTIVE"
  | "MAINTENANCE"
  | "REPAIR"
  | "INSPECTION"
  | "OTHER";

export interface SiteMeter {
  id?: string;
  mpan_no: string;
  meter_serial_no: string;
  meter_type: MeterType;
  is_primary: boolean;
}

export interface SiteBessUnit {
  id?: string;
  brand: string;
  model: string;
  serial_no: string;
  capacity_kw: number | null;
  capacity_kwh: number | null;
  allocation_date: string;
  notes: string;
}

export interface SiteServiceRecord {
  id?: string;
  service_type: ServiceType;
  service_date: string;
  next_service_date: string;
  description: string;
  documentation_url: string;
  performed_by: string;
  cost: number | null;
  status: ServiceStatus;
}

export interface SitePaymentSchedule {
  id?: string;
  description: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: PaymentStatus;
  reference_no: string;
  paid_date: string;
}

export interface SitesFormData {
  id?: string;
  company_id?: string;

  site_no: string;
  site_name: string;
  gsp_uk: string;
  distributor_network_operator: string;
  segments: string;

  connection_size: number | null;
  connection_size_approved: number | null;
  connection_size_unit: "KW" | "KVA" | "MW" | "MVA";

  bess_brand_model: string;
  bess_function_trading: string;
  bess_function: BessFunction;
  ups_enabled: boolean;

  status: SiteStatus;

  service_interval_months: number | null;
  service_start_date: string;
  service_notes: string;

  payment_frequency: PaymentFrequency;
  allow_partial_payments: boolean;
  payment_currency: string;
  contract_amount: number | null;
  payment_notes: string;

  meters: SiteMeter[];
  bess_units: SiteBessUnit[];
  services: SiteServiceRecord[];
  payment_schedules: SitePaymentSchedule[];
}

export interface SitesListRow {
  id: string;
  site_no: string;
  site_name: string | null;
  gsp_uk: string | null;
  distributor_network_operator: string | null;
  mpan_no: string | null;
  connection_size: number | string | null;
  connection_size_approved: number | string | null;
  bess_brand_model: string | null;
  bess_function_trading: string | null;
  segments: string | null;
  status: number;
  meter_count?: number;
  bess_unit_count?: number;
}

export const createDefaultSite = (): SitesFormData => ({
  site_no: "",
  site_name: "",
  gsp_uk: "",
  distributor_network_operator: "",
  segments: "",

  connection_size: null,
  connection_size_approved: null,
  connection_size_unit: "KW",

  bess_brand_model: "",
  bess_function_trading: "",
  bess_function: "TRADING",
  ups_enabled: false,

  status: 1,

  service_interval_months: 6,
  service_start_date: "",
  service_notes: "",

  payment_frequency: "QUARTERLY",
  allow_partial_payments: true,
  payment_currency: "GBP",
  contract_amount: null,
  payment_notes: "",

  meters: [],
  bess_units: [],
  services: [],
  payment_schedules: [],
});


/* export type SitesListRow = {
  id: string;
  site_no: string | undefined;
  distributor_network_operator: string | null;
  mpan_no: string | null;
  connection_size: string | null;
  connection_size_approved: string | null;
  bess_brand_model: string | null;
  bess_function_trading: string | null;
  segments?: string | null;
  gsp_uk: string | null;
  status: number;
};

export type SitesFormData = {
  id?: string;
  company_id?: string;
  site_no: string | undefined;
  distributor_network_operator: string | undefined;
  mpan_no: string | undefined;
  connection_size: string | null;
  connection_size_approved: string | null;
  bess_brand_model: string | null;
  bess_function_trading: string | null;
  segments?: string | null;
  gsp_uk: string | null;
  status: number;
}; */
