// lib/services/rebate-posting.service.ts

import type { PoolClient } from "pg";
import type { RebateContext } from "./rebate-eligibility.service";
import { findEligibleRebates } from "./rebate-eligibility.service";
import { calculateRebates } from "./rebate-calculation.service";
import { RebateError } from "./rebate.service";

export interface PostedLineContext extends RebateContext {
  sourceDocumentType: string;
  sourceDocumentId: string;
  sourceDocumentLineId: string;
  exchangeRate: string;
}

// Call INSIDE the invoice posting transaction, after the invoice line has been finalized.
export async function recordEarnedRebates(
  client: PoolClient,
  ctx: PostedLineContext,
) {
  const rules = await findEligibleRebates(client, ctx);
  const quotes = calculateRebates(ctx, rules);

  for (const q of quotes) {
    if (q.settlement_method === "IMMEDIATE")
      throw new RebateError(
        "Immediate rebate posting requires invoice/tax integration before enabling",
        409,
      );

    await client.query(
      `INSERT INTO rebate_transactions(company_id,rebate_id,party_id,rebate_type,source_document_type,source_document_id,source_document_line_id,posting_date,item_id,uom_id,quantity,base_amount,rebate_rate,rebate_amount,currency_id,exchange_rate,settlement_method,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'EARNED') ON CONFLICT (company_id,rebate_id,source_document_type,source_document_line_id) DO NOTHING`,
      [
        ctx.companyId,
        q.rebate_id,
        ctx.partyId,
        ctx.rebateType,
        ctx.sourceDocumentType,
        ctx.sourceDocumentId,
        ctx.sourceDocumentLineId,
        ctx.postingDate,
        ctx.itemId,
        ctx.uomId,
        ctx.quantity,
        q.base_amount,
        q.rebate_rate,
        q.rebate_amount,
        ctx.currencyId,
        ctx.exchangeRate,
        q.settlement_method,
      ],
    );
  }
  return quotes;
}
