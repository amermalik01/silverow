// lib/services/payments/allocation.service.ts

import { PoolClient } from "pg";
import { FxVarianceService } from "@/lib/services/fx/fx-variance.service";

export interface ApplyAllocationItem {
  invoice_ledger_id: string; // References vendor_ledger_entries.id or customer_ledger_entries.id
  amount: number;
}

export class AllocationService {
  /**
   * Apply AP (Vendor) Allocations
   */

  static async applyAP(
    client: PoolClient,
    companyId: string,
    paymentLedgerId: string,
    vendorId: string,
    allocations: ApplyAllocationItem[],
    userId?: string,
  ) {
    // 1. Fetch and Lock Payment Ledger Entry first
    const paymentRes = await client.query(
      `SELECT id, remaining_amount_fcy, is_open, currency_id, exchange_rate, document_no
       FROM vendor_ledger_entries 
       WHERE id = $1 AND company_id = $2 AND vendor_id = $3 AND is_open = true 
       FOR UPDATE`,
      [paymentLedgerId, companyId, vendorId],
    );

    if (!paymentRes.rows.length) {
      throw new Error(
        "Source payment ledger entry was not found or has no open balance.",
      );
    }

    const payLedger = paymentRes.rows[0];
    const payRate = Number(payLedger.exchange_rate || 1.0);

    const originalPaySign =
      Math.sign(Number(payLedger.remaining_amount_fcy)) || 1;
    let payRemainingFCYAbs = Math.abs(Number(payLedger.remaining_amount_fcy));

    for (const alloc of allocations) {
      const roundedAllocAmountFCY = Number(alloc.amount.toFixed(2));
      if (roundedAllocAmountFCY <= 0) continue;

      // GUARDRAIL 1: Self-allocation check
      if (alloc.invoice_ledger_id === paymentLedgerId) {
        throw new Error("Cannot allocate a ledger entry to itself.");
      }

      // GUARDRAIL 2: Check running payment remaining balance
      if (roundedAllocAmountFCY > payRemainingFCYAbs + 0.001) {
        throw new Error(
          `Allocation amount (${roundedAllocAmountFCY}) exceeds unallocated payment balance (${payRemainingFCYAbs.toFixed(2)}).`,
        );
      }

      // 2. Fetch & Lock Target Invoice Ledger Entry
      const invoiceRes = await client.query(
        `SELECT id, remaining_amount_fcy, is_open, currency_id, exchange_rate, document_no
         FROM vendor_ledger_entries 
         WHERE id = $1 AND company_id = $2 AND vendor_id = $3 AND is_open = true 
         FOR UPDATE`,
        [alloc.invoice_ledger_id, companyId, vendorId],
      );

      if (!invoiceRes.rows.length) {
        throw new Error("Target open vendor ledger entry was not found.");
      }

      const invLedger = invoiceRes.rows[0];
      const invRate = Number(invLedger.exchange_rate || 1.0);

      const originalInvSign =
        Math.sign(Number(invLedger.remaining_amount_fcy)) || 1;
      const invRemainingFCYAbs = Math.abs(
        Number(invLedger.remaining_amount_fcy),
      );

      if (roundedAllocAmountFCY > invRemainingFCYAbs + 0.01) {
        throw new Error(
          `Allocation amount (${roundedAllocAmountFCY}) exceeds open invoice balance (${invRemainingFCYAbs.toFixed(2)}).`,
        );
      }

      // 3. Convert FCY Allocation Amount to LCY
      // const allocAmountInvoiceLCY = Number(
      //   (roundedAllocAmountFCY * invRate).toFixed(2),
      // );
      // const allocAmountPaymentLCY = Number(
      //   (roundedAllocAmountFCY * payRate).toFixed(2),
      // );

      // 3. Calculate Realized FX Variance
      const fx = await FxVarianceService.calculateVariance(client, {
        companyId,
        allocationType: "AP",
        invoiceExchangeRate: invRate,
        paymentExchangeRate: payRate,
        allocatedAmountFCY: roundedAllocAmountFCY,
      });

      // 4. Record Allocation Line with FX Variance
      const allocInsertRes = await client.query(
        `INSERT INTO ledger_allocations (
          company_id, allocation_type, payment_entry_id, ledger_entry_id, 
          allocated_amount_fcy, exchange_rate, allocation_date, realized_gain_loss, created_by
        ) VALUES ($1, 'AP', $2, $3, $4, $5, CURRENT_DATE, $6, $7)
         RETURNING id`,
        [
          companyId,
          paymentLedgerId, // Correct source payment entry ID
          invLedger.id, // Correct target invoice entry ID
          roundedAllocAmountFCY,
          payLedger.exchange_rate,
          fx.realizedGainLoss,
          userId || null,
        ],
      );

      const allocationId = allocInsertRes.rows[0].id;

      // 5. Update Invoice Remaining Balance safely in FCY
      const newInvRemainingFCYAbs = Math.max(
        0,
        Number((invRemainingFCYAbs - roundedAllocAmountFCY).toFixed(2)),
      );
      const finalInvRemaining = newInvRemainingFCYAbs * originalInvSign;

      await client.query(
        `UPDATE vendor_ledger_entries 
         SET remaining_amount_fcy = $1, is_open = $2, updated_at = NOW()
         WHERE id = $3`,
        [finalInvRemaining, newInvRemainingFCYAbs > 0.001, invLedger.id],
      );

      // 6. Update Remaining Balance in vendor_ledger_entries
      payRemainingFCYAbs = Math.max(
        0,
        Number((payRemainingFCYAbs - roundedAllocAmountFCY).toFixed(2)),
      );
      const finalPayRemaining = payRemainingFCYAbs * originalPaySign;

      await client.query(
        `UPDATE vendor_ledger_entries 
         SET remaining_amount_fcy = $1, is_open = $2, updated_at = NOW()
         WHERE id = $3`,
        [finalPayRemaining, payRemainingFCYAbs > 0.001, payLedger.id],
      );

      // 7. Post GL Entries if FX Variance exists
      if (Math.abs(fx.realizedGainLoss) > 0.0001) {
        await this.postFxGlEntries(client, {
          companyId,
          allocationId,
          allocationType: "AP",
          partyType: "supplier",
          partyId: vendorId,
          varianceLCY: Math.abs(fx.realizedGainLoss),
          fxGlAccountId: fx.glAccountId,
          isGain: fx.isGain,
          documentNo: invLedger.document_no || invLedger.id,
        });
      }
    }
  }

  /**
   * Apply AR (Customer) Allocations
   */

  static async applyAR(
    client: PoolClient,
    companyId: string,
    paymentLedgerId: string,
    customerId: string,
    allocations: ApplyAllocationItem[],
    userId?: string,
  ) {
    // 1. Fetch and Lock Source Payment/Credit Ledger Entry
    const paymentRes = await client.query(
      `SELECT id, remaining_amount_fcy, is_open, currency_id, exchange_rate, document_no
       FROM customer_ledger_entries 
       WHERE id = $1 AND company_id = $2 AND customer_id = $3 AND is_open = true 
       FOR UPDATE`,
      [paymentLedgerId, companyId, customerId],
    );

    if (!paymentRes.rows.length) {
      throw new Error(
        "Source payment ledger entry was not found or has no open balance.",
      );
    }

    const payLedger = paymentRes.rows[0];
    const payRate = Number(payLedger.exchange_rate || 1.0);

    const originalPaySign =
      Math.sign(Number(payLedger.remaining_amount_fcy)) || 1;
    let payRemainingFCYAbs = Math.abs(Number(payLedger.remaining_amount_fcy));

    for (const alloc of allocations) {
      const roundedAllocAmountFCY = Number(alloc.amount.toFixed(2));
      if (roundedAllocAmountFCY <= 0) continue;

      // GUARDRAIL 1: Self-allocation check
      if (alloc.invoice_ledger_id === paymentLedgerId) {
        throw new Error("Cannot allocate a ledger entry to itself.");
      }

      // GUARDRAIL 2: Check running payment remaining balance
      if (roundedAllocAmountFCY > payRemainingFCYAbs + 0.001) {
        throw new Error(
          `Allocation amount (${roundedAllocAmountFCY}) exceeds unallocated payment balance (${payRemainingFCYAbs.toFixed(2)}).`,
        );
      }

      // 2. Fetch & Lock Target Invoice Ledger Entry
      const invoiceRes = await client.query(
        `SELECT id, remaining_amount_fcy, is_open, currency_id, exchange_rate, document_no
         FROM customer_ledger_entries 
         WHERE id = $1 AND company_id = $2 AND customer_id = $3 AND is_open = true 
         FOR UPDATE`,
        [alloc.invoice_ledger_id, companyId, customerId],
      );

      if (!invoiceRes.rows.length) {
        throw new Error("Target open customer ledger entry was not found.");
      }

      const invLedger = invoiceRes.rows[0];
      const invRate = Number(invLedger.exchange_rate || 1.0);

      const originalInvSign =
        Math.sign(Number(invLedger.remaining_amount_fcy)) || 1;
      const invRemainingFCYAbs = Math.abs(
        Number(invLedger.remaining_amount_fcy),
      );

      if (roundedAllocAmountFCY > invRemainingFCYAbs + 0.01) {
        throw new Error(
          `Allocation amount (${roundedAllocAmountFCY}) exceeds open invoice balance (${invRemainingFCYAbs.toFixed(2)}).`,
        );
      }

      // 3. Calculate Realized FX Variance
      const fx = await FxVarianceService.calculateVariance(client, {
        companyId,
        allocationType: "AR",
        invoiceExchangeRate: invRate,
        paymentExchangeRate: payRate,
        allocatedAmountFCY: roundedAllocAmountFCY,
      });

      // 4. Record Allocation Line with FX Variance
      const allocInsertRes = await client.query(
        `INSERT INTO ledger_allocations (
          company_id, allocation_type, payment_entry_id, ledger_entry_id, 
          allocated_amount_fcy, exchange_rate, allocation_date, realized_gain_loss, created_by
        ) VALUES ($1, 'AR', $2, $3, $4, $5, CURRENT_DATE, $6, $7)
         RETURNING id`,
        [
          companyId,
          paymentLedgerId,
          invLedger.id,
          roundedAllocAmountFCY,
          payLedger.exchange_rate,
          fx.realizedGainLoss,
          userId || null,
        ],
      );

      const allocationId = allocInsertRes.rows[0].id;

      // 5. Update Invoice Remaining Balance in customer_ledger_entries
      const newInvRemainingFCYAbs = Math.max(
        0,
        Number((invRemainingFCYAbs - roundedAllocAmountFCY).toFixed(2)),
      );
      const finalInvRemaining = newInvRemainingFCYAbs * originalInvSign;

      await client.query(
        `UPDATE customer_ledger_entries 
         SET remaining_amount_fcy = $1, is_open = $2, updated_at = NOW() 
         WHERE id = $3`,
        [finalInvRemaining, newInvRemainingFCYAbs > 0.001, invLedger.id],
      );

      // 6. Update Payment Remaining Balance in customer_ledger_entries
      payRemainingFCYAbs = Math.max(
        0,
        Number((payRemainingFCYAbs - roundedAllocAmountFCY).toFixed(2)),
      );

      const finalPayRemaining = payRemainingFCYAbs * originalPaySign;

      await client.query(
        `UPDATE customer_ledger_entries 
         SET remaining_amount_fcy = $1, is_open = $2, updated_at = NOW() 
         WHERE id = $3`,
        [finalPayRemaining, payRemainingFCYAbs > 0.001, payLedger.id],
      );

      // 7. Post GL Entries if FX Variance exists
      if (Math.abs(fx.realizedGainLoss) > 0.0001) {
        await this.postFxGlEntries(client, {
          companyId,
          allocationId,
          allocationType: "AR",
          partyType: "customer",
          partyId: customerId,
          varianceLCY: Math.abs(fx.realizedGainLoss),
          fxGlAccountId: fx.glAccountId,
          isGain: fx.isGain,
          documentNo: invLedger.document_no || invLedger.id,
        });
      }
    }
  }

  /**
   * Unapply / Reverse an Allocation
   */

  static async unapplyAllocation(
    client: PoolClient,
    companyId: string,
    allocationId: string,
  ) {
    const allocRes = await client.query(
      `SELECT * FROM ledger_allocations WHERE id = $1 AND company_id = $2 AND is_unapplied = false FOR UPDATE`,
      [allocationId, companyId],
    );

    if (!allocRes.rows.length) throw new Error("Active allocation not found.");

    const alloc = allocRes.rows[0];
    const amountFCY = Number(alloc.allocated_amount); // FCY Amount
    const isAP = alloc.allocation_type === "AP";
    const table = isAP ? "vendor_ledger_entries" : "customer_ledger_entries";

    // 1. Revert Invoice Sub-Ledger Entry in FCY (preserving negative/positive direction)
    await client.query(
      `UPDATE ${table} 
       SET 
          remaining_amount_fcy = CASE 
            WHEN remaining_amount_fcy < 0 THEN remaining_amount_fcy - $1 
            ELSE remaining_amount_fcy + $1 
          END, 
          is_open = true, 
          updated_at = NOW() 
       WHERE id = $2`,
      [amountFCY, alloc.ledger_entry_id],
    );

    // 2. Revert Payment Sub-Ledger Entry in FCY
    await client.query(
      `UPDATE ${table} 
       SET remaining_amount_fcy = CASE 
         WHEN remaining_amount_fcy < 0 THEN remaining_amount_fcy - $1 
         ELSE remaining_amount_fcy + $1 
       END, 
       is_open = true, 
       updated_at = NOW()
       WHERE id = $2`,
      [amountFCY, alloc.payment_entry_id],
    );

    // 3. Reverse FX GL Ledger Entries if they were posted
    const fxEntries = await client.query(
      `SELECT * FROM gl_ledger_entries WHERE reference = $1 AND company_id = $2`,
      [`ALLOC_FX_${allocationId}`, companyId],
    );

    if (fxEntries.rows.length > 0) {
      // const txKeyResult = await client.query(
      //   "SELECT nextval('gl_transaction_id_seq') AS tx_id",
      // );
      // const revTxId = parseInt(txKeyResult.rows[0].tx_id, 10); transaction_id,

      for (const entry of fxEntries.rows) {
        await client.query(
          `INSERT INTO gl_ledger_entries (
            company_id, account_id, entry_no, posting_date,
            source_type, reference, description, debit, credit, party_type, party_id, document_no, posted_at
          ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
          [
            companyId,
            entry.account_id,
            // revTxId,
            `${entry.entry_no}-REV`,
            "FX_REVERSAL",
            `UNAPPLY_FX_${allocationId}`,
            `Reversal: ${entry.description}`,
            entry.credit, // Invert Debit/Credit
            entry.debit,
            entry.party_type,
            entry.party_id,
            entry.document_no || entry.entry_no,
          ],
        );
      }
    }

    // 4. Mark allocation as unapplied
    await client.query(
      `UPDATE ledger_allocations SET is_unapplied = true, unapplied_at = NOW() WHERE id = $1`,
      [allocationId],
    );
  }

  /**
   * Dedicated Helper to Resolving Control Accounts and Inserting FX GL Ledger Entries
   */
  private static async postFxGlEntries(
    client: PoolClient,
    params: {
      companyId: string;
      allocationId: string;
      allocationType: "AP" | "AR";
      partyType: "supplier" | "customer";
      partyId: string;
      varianceLCY: number;
      fxGlAccountId: string;
      isGain: boolean;
      documentNo: string;
    },
  ) {
    const {
      companyId,
      allocationId,
      allocationType,
      partyType,
      partyId,
      varianceLCY,
      fxGlAccountId,
      isGain,
      documentNo,
    } = params;

    // 1. Resolve Control GL Account via the unified `parties` table (matching Journal logic)
    let controlGlAccountId: string | null = null;

    if (partyType === "supplier") {
      const partyRes = await client.query(
        `SELECT 
            p.gl_account_payable, 
            ppg.payable_account_id AS group_account_id
         FROM parties p
         LEFT JOIN purchase_posting_groups ppg ON p.purchase_posting_group_id = ppg.id
         WHERE p.id = $1 AND p.company_id = $2`,
        [partyId, companyId],
      );

      const party = partyRes.rows[0];

      controlGlAccountId =
        party?.group_account_id || party?.gl_account_payable || null;

      if (!controlGlAccountId) {
        const fallback = await client.query(
          `SELECT payable_account_id FROM purchase_posting_groups WHERE company_id = $1 LIMIT 1`,
          [companyId],
        );
        controlGlAccountId = fallback.rows[0]?.payable_account_id || null;
      }
    } else {
      const partyRes = await client.query(
        `SELECT 
            p.gl_account_receivable, 
            spg.receivable_account_id AS group_account_id
         FROM parties p
         LEFT JOIN sales_posting_groups spg ON p.sales_posting_group_id = spg.id
         WHERE p.id = $1 AND p.company_id = $2`,
        [partyId, companyId],
      );

      const party = partyRes.rows[0];

      controlGlAccountId =
        party?.group_account_id || party?.gl_account_receivable || null;

      if (!controlGlAccountId) {
        const fallback = await client.query(
          `SELECT receivable_account_id FROM sales_posting_groups WHERE company_id = $1 LIMIT 1`,
          [companyId],
        );
        controlGlAccountId = fallback.rows[0]?.receivable_account_id || null;
      }
    }

    if (!controlGlAccountId) {
      throw new Error(
        `Control GL account for ${partyType} could not be resolved.`,
      );
    }

    // 2. Determine Debits and Credits based on Gain/Loss and AP/AR context
    let controlDebit = 0;
    let controlCredit = 0;
    let fxDebit = 0;
    let fxCredit = 0;

    if (allocationType === "AP") {
      if (isGain) {
        // Gain reduces AP Liability
        controlDebit = varianceLCY;
        fxCredit = varianceLCY;
      } else {
        // Loss increases AP Liability
        fxDebit = varianceLCY;
        controlCredit = varianceLCY;
      }
    } else {
      if (isGain) {
        // Gain increases Income / adjusts AR
        controlDebit = varianceLCY;
        fxCredit = varianceLCY;
      } else {
        // Loss reduces Receivables / adds Expense
        fxDebit = varianceLCY;
        controlCredit = varianceLCY;
      }
    }

    // 3. Get next transaction sequence
    // const txKeyResult = await client.query(
    //   "SELECT nextval('gl_transaction_id_seq') AS tx_id",
    // );
    // const transactionId = parseInt(txKeyResult.rows[0].tx_id, 10);
    // const refTag = `ALLOC_FX_${allocationId}`;

    const refTag = `ALLOC_FX_${allocationId}`;

    // 4. Post Control Account Leg
    await client.query(
      `INSERT INTO gl_ledger_entries (
        company_id, account_id, entry_no, posting_date,
        source_type, reference, description, debit, credit, party_type, party_id, document_no, posted_at
      ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        companyId,
        controlGlAccountId,
        documentNo,
        "FX_VARIANCE",
        refTag,
        `Realized FX ${isGain ? "Gain" : "Loss"} Allocation Adjustment`,
        controlDebit,
        controlCredit,
        partyType,
        partyId,
        documentNo,
      ],
    );

    // 5. Post Realized FX Gain/Loss Leg
    await client.query(
      `INSERT INTO gl_ledger_entries (
        company_id, account_id, entry_no, posting_date,
        source_type, reference, description, debit, credit, party_type, party_id, document_no, posted_at
      ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        companyId,
        fxGlAccountId,
        documentNo,
        "FX_VARIANCE",
        refTag,
        `Realized FX ${isGain ? "Gain" : "Loss"} Line`,
        fxDebit,
        fxCredit,
        null,
        null,
        documentNo,
      ],
    );
  }
}
