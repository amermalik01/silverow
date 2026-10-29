// lib/services/rebate-calculation.service.ts

import Decimal from "decimal.js";
import type { EligibleRule, RebateContext } from "./rebate-eligibility.service";

export interface RebateQuote {
  rebate_id: string;
  rebate_no: string;
  settlement_method: "IMMEDIATE" | "DEFERRED";
  base_amount: string;
  rebate_rate: string | null;
  rebate_amount: string;
}

export function calculateRebates(
  ctx: RebateContext,
  rules: EligibleRule[],
): RebateQuote[] {
  if (ctx.quantity <= 0 || ctx.netUnitPrice < 0 || ctx.standardUnitPrice < 0)
    throw new Error("Invalid rebate calculation input");

  // Default policy: highest-specificity non-stackable winner. Stacking is not implemented until explicit policy is approved.

  const selected = rules.slice(0, 1);

  return selected.map((rule) => {
    const qty = new Decimal(ctx.quantity);

    const unit = new Decimal(
      rule.rebate_base === "NET_PRICE"
        ? ctx.netUnitPrice
        : ctx.standardUnitPrice,
    );

    const base = unit.mul(qty);
    let value = new Decimal(rule.rebate_value);

    if (rule.calculation_method === "TIERED") {
      const tier = rule.tiers.find(
        (t) =>
          qty.gte(t.min_quantity) &&
          (t.max_quantity === null || qty.lte(t.max_quantity)),
      );

      if (!tier)
        return {
          rebate_id: rule.id,
          rebate_no: rule.rebate_no,
          settlement_method: rule.settlement_method,
          base_amount: base.toFixed(6),
          rebate_rate: null,
          rebate_amount: "0.000000",
        };
      value = new Decimal(tier.rebate_value);
    }

    if (value.lt(0) || (rule.price_type === "PERCENTAGE" && value.gt(100)))
      throw new Error("Invalid rebate value");
    // FIXED_AMOUNT is defined here as amount per eligible unit; reject unsupported configurations at activation.

    const raw =
      rule.price_type === "PERCENTAGE"
        ? base.mul(value).div(100)
        : qty.mul(value);

    const amount = Decimal.min(base, raw).toDecimalPlaces(
      6,
      Decimal.ROUND_HALF_UP,
    );

    return {
      rebate_id: rule.id,
      rebate_no: rule.rebate_no,
      settlement_method: rule.settlement_method,
      base_amount: base.toFixed(6),
      rebate_rate: rule.price_type === "PERCENTAGE" ? value.toFixed(6) : null,
      rebate_amount: amount.toFixed(6),
    };
  });
}
