// lib/validators/postingGate.ts

import { pool } from "@/lib/db";

interface PostingValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates whether a transaction date is permitted to post inside the system ledger.
 * * @param companyId The active company ID execution scope
 * @param executionPostingDate The target date string (YYYY-MM-DD) intended to write records
 * @returns PostingValidationResult containing status boolean and explicit error explanation
 */
export async function validateLedgerPostingDate(
  companyId: string,
  executionPostingDate: string,
): Promise<PostingValidationResult> {
  try {
    // Look up the specific period matching the transaction date
    const query = `
      SELECT id, is_closed 
      FROM accounting_periods 
      WHERE company_id = $1 
        AND $2 >= start_date 
        AND $2 <= end_date
      LIMIT 1
    `;

    const result = await pool.query(query, [companyId, executionPostingDate]);

    // Scenario A: Date falls completely outside of any defined fiscal structure
    if (result.rowCount === 0) {
      return {
        allowed: false,
        reason: `Posting rejected. The date ${executionPostingDate} does not fall within any defined accounting period framework. Create a new fiscal structure window first.`,
      };
    }

    const targetPeriod = result.rows[0];

    // Scenario B: The date exists but the financial period has been locked/closed
    if (targetPeriod.is_closed) {
      return {
        allowed: false,
        reason: `Posting rejected. The transaction falls within a locked/closed accounting period. Reopen the period via administration dashboard if mutations are required.`,
      };
    }

    // Success condition
    return { allowed: true };
  } catch (error) {
    console.error(
      "Critical failure verifying internal posting gate rule engine:",
      error,
    );
    return {
      allowed: false,
      reason:
        "Internal processing engine failed to verify ledger locking rules.",
    };
  }
}




/* 

How to use it in your transactional API handlers:


import { validateLedgerPostingDate } from "@/lib/validators/postingGate";

// Inside your entry posting endpoint (invoice, manual journal entry, payment run, etc.)
const gateCheck = await validateLedgerPostingDate(session.user.company_id, body.posting_date);

if (!gateCheck.allowed) {
  return NextResponse.json({ error: gateCheck.reason }, { status: 400 });
}

// Proceed with posting transaction lines safely...
*/