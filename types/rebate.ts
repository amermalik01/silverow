// types/rebate.ts

export type RebateType = "SALES" | "PURCHASE";
export type RebateScope = "UNIVERSAL" | "CATEGORY" | "ITEM";
export type RebatePriceType = "PERCENTAGE" | "FIXED_AMOUNT";

export type RebateStatus =
  | "DRAFT"
  | "ACTIVE"
  | "SUSPENDED"
  | "EXPIRED"
  | "CANCELLED";

export type RebateCalculationMethod = "FLAT" | "TIERED";
export type RebateSettlementMethod = "IMMEDIATE" | "DEFERRED";
export type RebateBase = "STANDARD_PRICE" | "NET_PRICE";

export interface RebateCategory {
  id?: string;
  category_id: string;
  category_name?: string;
}

export interface RebateItem {
  id?: string;
  item_id: string;
  item_code?: string;
  item_name?: string;
  uom_id?: string | null;
  uom_name?: string;
}

export interface RebateTier {
  id?: string;
  min_quantity: number;
  max_quantity: number | null;
  rebate_value: number;
}

export interface RebateDraft {
  id?: string;
  party_id: string;
  rebate_no?: string;
  name: string;
  rebate_type: RebateType;
  scope: RebateScope;
  calculation_method: RebateCalculationMethod;
  price_type: RebatePriceType;
  rebate_value: number;
  rebate_base: RebateBase;
  settlement_method: RebateSettlementMethod;
  currency_id: string;
  start_date: string;
  end_date: string;
  priority: number;
  is_stackable: boolean;
  status?: RebateStatus;
  notes: string;
  categories: RebateCategory[];
  items: RebateItem[];
  tiers: RebateTier[];
}

export interface RebateHistoryEntry {
  id: string;
  action: string;
  changed_at: string;
  changed_by?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
}

export interface RebateTransaction {
  id: string;
  posting_date: string;
  source_document_type: string;
  source_document_id: string;
  quantity: number | string;
  base_amount: number | string;
  rebate_amount: number | string;
  status: string;
}

export interface RebateLookupOption {
  id: string;
  code?: string;
  name: string;
  uom_id?: string | null;
  uom_name?: string;
}

export interface RebateTabProps {
  partyId: string;
  rebateType: RebateType;
  baseCurrencyId: string;
  isReadonly?: boolean;
}

export const newRebate = (
  partyId: string,
  rebateType: RebateType,
  currencyId: string,
): RebateDraft => {
  const today = new Date();
  const iso = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const end = new Date(
    today.getFullYear() + 1,
    today.getMonth(),
    today.getDate(),
  );

  return {
    party_id: partyId,
    name: rebateType === "SALES" ? "Customer Rebate" : "Supplier Rebate",
    rebate_type: rebateType,
    scope: "UNIVERSAL",
    calculation_method: "FLAT",
    price_type: "PERCENTAGE",
    rebate_value: 0,
    rebate_base: "NET_PRICE",
    settlement_method: "DEFERRED",
    currency_id: currencyId,
    start_date: iso(today),
    end_date: iso(end),
    priority: 100,
    is_stackable: false,
    status: "DRAFT",
    notes: "",
    categories: [],
    items: [],
    tiers: [],
  };
};
