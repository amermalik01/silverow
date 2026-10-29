// lib/services/rebate-eligibility.service.ts

import type { PoolClient } from "pg";

export interface RebateContext {
  companyId: string;
  partyId: string;
  rebateType: "SALES" | "PURCHASE";
  postingDate: string;
  itemId: string;
  uomId: string | null;
  categoryIds: string[];
  quantity: number;
  netUnitPrice: number;
  standardUnitPrice: number;
  currencyId: string;
}

export interface EligibleRule {
  id: string;
  rebate_no: string;
  scope: "UNIVERSAL" | "CATEGORY" | "ITEM";
  price_type: "PERCENTAGE" | "FIXED_AMOUNT";
  rebate_value: string;
  rebate_base: "NET_PRICE" | "STANDARD_PRICE";
  settlement_method: "IMMEDIATE" | "DEFERRED";
  calculation_method: "FLAT" | "TIERED";
  priority: number;
  is_stackable: boolean;
  currency_id: string;
  tiers: {
    min_quantity: string;
    max_quantity: string | null;
    rebate_value: string;
  }[];
}

export async function findEligibleRebates(
  client: PoolClient,
  ctx: RebateContext,
): Promise<EligibleRule[]> {
  const r = await client.query(
    `SELECT ra.id,ra.rebate_no,ra.scope,ra.price_type,ra.rebate_value,ra.rebate_base,ra.settlement_method,ra.calculation_method,ra.priority,ra.is_stackable,ra.currency_id, COALESCE((SELECT json_agg(json_build_object('min_quantity',t.min_quantity,'max_quantity',t.max_quantity,'rebate_value',t.rebate_value) ORDER BY t.min_quantity) FROM rebate_tiers t WHERE t.rebate_id=ra.id),'[]'::json) AS tiers FROM rebate_agreements ra WHERE ra.company_id=$1 AND ra.party_id=$2 AND ra.rebate_type=$3 AND ra.status='ACTIVE' AND ra.deleted_at IS NULL AND $4::date BETWEEN ra.start_date AND ra.end_date AND ra.currency_id=$5 AND (ra.scope='UNIVERSAL' OR (ra.scope='ITEM' AND EXISTS (SELECT 1 FROM rebate_items ri WHERE ri.rebate_id=ra.id AND ri.item_id=$6 AND (ri.uom_id IS NULL OR ri.uom_id=$7))) OR (ra.scope='CATEGORY' AND EXISTS(SELECT 1 FROM rebate_categories rc WHERE rc.rebate_id=ra.id AND rc.category_id=ANY($8::uuid[])))) ORDER BY CASE ra.scope WHEN 'ITEM' THEN 0 WHEN 'CATEGORY' THEN 1 ELSE 2 END, ra.priority ASC,ra.id ASC`,
    [
      ctx.companyId,
      ctx.partyId,
      ctx.rebateType,
      ctx.postingDate,
      ctx.currencyId,
      ctx.itemId,
      ctx.uomId,
      ctx.categoryIds,
    ],
  );
  return r.rows as EligibleRule[];
}
