// lib/constants/table-configs/index.ts

import { ColumnConfig } from "@/types/table";

import { purchaseOrdersConfig } from "./purchase-orders";
import { purchaseInvoicesConfig } from "./purchase-invoices";

import { debitNotesConfig } from "./debit-note";
import { postedDebitNotesConfig } from "./posted-debit-note";

import { partyColumnsConfig } from "./parties";

import { SRM_VendorsConfig } from "./srm_vendors";
import { suppliersConfig } from "./suppliers";

import { CRM_LeadConfig } from "./crm_leads";
import { customersConfig } from "./customers";

import { salesOrdersConfig } from "./sales-orders";
import { salesInvoicesConfig } from "./sales-invoices";

import { itemColumnsConfig } from "./Items";
import { EmployeeConfig } from "./Employee";

export const DEFAULT_CONFIGS: Record<string, ColumnConfig[]> = {

  purchase_orders: purchaseOrdersConfig,
  purchase_invoices: purchaseInvoicesConfig,

  debit_notes: debitNotesConfig,
  posted_debit_notes: postedDebitNotesConfig,
  
  sales_orders: salesOrdersConfig,
  sales_invoices: salesInvoicesConfig,

  parties: partyColumnsConfig,

  srm_vendors: SRM_VendorsConfig,
  suppliers: suppliersConfig,
  crm_leads: CRM_LeadConfig,
  customers: customersConfig,

  inventory_items: itemColumnsConfig,

  hr_employees: EmployeeConfig,
  
};

export function getDefaultTableConfig(moduleKey: string): ColumnConfig[] {
  return DEFAULT_CONFIGS[moduleKey] || [];
}
