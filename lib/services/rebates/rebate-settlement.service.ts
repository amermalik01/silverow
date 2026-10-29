// lib/services/rebate-settlement.service.ts

import type { PoolClient } from "pg";
import { RebateError } from "./rebate.service";

// Deliberately no fake settlement posting: requires actual rebate_settlements,
// rebate_settlement_lines and credit/debit-note posting contracts.

export async function settleEarnedRebates(
  _client: PoolClient,
  _companyId: string,
  _rebateId: string,
): Promise<never> {
  throw new RebateError(
    "Settlement is not enabled: integrate approved settlement documents and G/L postings first",
    501,
  );
}
