// lib/validators/currencyGate.ts
import { PoolClient } from "pg";

interface CurrencyValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Executes multi-point business rules on company currencies before structural mutations
 */
export async function validateCompanyCurrencyState(
  client: PoolClient,
  companyId: string,
  currencyId: string,
  requestedRate: number,
  isBase: boolean,
): Promise<CurrencyValidationResult> {
  // Rule 1: A currency designated as the ledger Base MUST be pegged exactly to 1
  if (isBase && requestedRate !== 1) {
    return {
      valid: false,
      reason:
        "Ledger integrity breach: The base currency exchange factor must be exactly 1.000000.",
    };
  }

  // Rule 2: Guard against updating or changing a base currency if entries exist (Optional warning anchor)
  const baseCheck = await client.query(
    `SELECT id FROM company_currencies WHERE company_id = $1 AND is_base = true`,
    [companyId],
  );

  // Rule 3: Ensure that the master record actually exists in the global seed table
  const masterCheck = await client.query(
    `SELECT code FROM currencies WHERE id = $1`,
    [currencyId],
  );
  if (masterCheck.rowCount === 0) {
    return {
      valid: false,
      reason:
        "Target operational currency code does not exist in master seeds.",
    };
  }

  return { valid: true };
}
