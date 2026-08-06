// lib/services/payments/allocation.service.ts

import { PoolClient } from "pg";

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
    userId?: string
  ) {
    for (const alloc of allocations) {
      if (alloc.amount <= 0) continue;

      // 1. Fetch Target Invoice Ledger Entry
      const invoiceRes = await client.query(
        `SELECT id, remaining_amount, is_open, currency_id, exchange_rate 
         FROM vendor_ledger_entries 
         WHERE id = $1 AND company_id = $2 AND vendor_id = $3 AND is_open = true 
         FOR UPDATE`,
        [alloc.invoice_ledger_id, companyId, vendorId]
      );

      if (!invoiceRes.rows.length) {
        throw new Error("Target open vendor ledger entry was not found.");
      }

      const invLedger = invoiceRes.rows[0];
      const invRemaining = Number(invLedger.remaining_amount);

      if (alloc.amount > invRemaining + 0.001) {
        throw new Error(`Allocation amount (${alloc.amount}) exceeds open invoice balance (${invRemaining}).`);
      }

      // 2. Fetch Payment Ledger Entry
      const paymentRes = await client.query(
        `SELECT id, remaining_amount, is_open 
         FROM vendor_ledger_entries 
         WHERE id = $1 AND company_id = $2 AND vendor_id = $3 AND is_open = true 
         FOR UPDATE`,
        [paymentLedgerId, companyId, vendorId]
      );

      if (!paymentRes.rows.length) {
        throw new Error("Source payment ledger entry was not found or has no open balance.");
      }

      const payLedger = paymentRes.rows[0];
      const payRemaining = Number(payLedger.remaining_amount);

      if (alloc.amount > payRemaining + 0.001) {
        throw new Error(`Allocation amount (${alloc.amount}) exceeds unallocated payment balance (${payRemaining}).`);
      }

      // 3. Record Allocation Line
      await client.query(
        `INSERT INTO ledger_allocations (
          company_id, allocation_type, payment_entry_id, ledger_entry_id, 
          allocated_amount, allocation_date, created_by
        ) VALUES ($1, 'AP', $2, $3, $4, CURRENT_DATE, $5)`,
        [companyId, paymentLedgerId, invLedger.id, alloc.amount, userId || null]
      );

      // 4. Update Invoice Remaining Balance
      const newInvRemaining = Number((invRemaining - alloc.amount).toFixed(2));
      await client.query(
        `UPDATE vendor_ledger_entries 
         SET remaining_amount = $1, is_open = $2 
         WHERE id = $3`,
        [newInvRemaining, newInvRemaining > 0, invLedger.id]
      );

      // 5. Update Payment Remaining Balance
      const newPayRemaining = Number((payRemaining - alloc.amount).toFixed(2));
      await client.query(
        `UPDATE vendor_ledger_entries 
         SET remaining_amount = $1, is_open = $2 
         WHERE id = $3`,
        [newPayRemaining, newPayRemaining > 0, payLedger.id]
      );
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
    userId?: string
  ) {
    for (const alloc of allocations) {
      if (alloc.amount <= 0) continue;

      // 1. Fetch Target Invoice Ledger Entry
      const invoiceRes = await client.query(
        `SELECT id, remaining_amount, is_open 
         FROM customer_ledger_entries 
         WHERE id = $1 AND company_id = $2 AND customer_id = $3 AND is_open = true 
         FOR UPDATE`,
        [alloc.invoice_ledger_id, companyId, customerId]
      );

      if (!invoiceRes.rows.length) {
        throw new Error("Target open customer ledger entry was not found.");
      }

      const invLedger = invoiceRes.rows[0];
      const invRemaining = Number(invLedger.remaining_amount);

      if (alloc.amount > invRemaining + 0.001) {
        throw new Error(`Allocation amount (${alloc.amount}) exceeds open invoice balance (${invRemaining}).`);
      }

      // 2. Fetch Payment Ledger Entry
      const paymentRes = await client.query(
        `SELECT id, remaining_amount, is_open 
         FROM customer_ledger_entries 
         WHERE id = $1 AND company_id = $2 AND customer_id = $3 AND is_open = true 
         FOR UPDATE`,
        [paymentLedgerId, companyId, customerId]
      );

      if (!paymentRes.rows.length) {
        throw new Error("Source payment ledger entry was not found.");
      }

      const payLedger = paymentRes.rows[0];
      const payRemaining = Number(payLedger.remaining_amount);

      if (alloc.amount > payRemaining + 0.001) {
        throw new Error(`Allocation amount (${alloc.amount}) exceeds unallocated payment balance (${payRemaining}).`);
      }

      // 3. Record Allocation Line
      await client.query(
        `INSERT INTO ledger_allocations (
          company_id, allocation_type, payment_entry_id, ledger_entry_id, 
          allocated_amount, allocation_date, created_by
        ) VALUES ($1, 'AR', $2, $3, $4, CURRENT_DATE, $5)`,
        [companyId, paymentLedgerId, invLedger.id, alloc.amount, userId || null]
      );

      // 4. Update Invoice Remaining
      const newInvRemaining = Number((invRemaining - alloc.amount).toFixed(2));
      await client.query(
        `UPDATE customer_ledger_entries 
         SET remaining_amount = $1, is_open = $2, updated_at = NOW() 
         WHERE id = $3`,
        [newInvRemaining, newInvRemaining > 0, invLedger.id]
      );

      // 5. Update Payment Remaining
      const newPayRemaining = Number((payRemaining - alloc.amount).toFixed(2));
      await client.query(
        `UPDATE customer_ledger_entries 
         SET remaining_amount = $1, is_open = $2, updated_at = NOW() 
         WHERE id = $3`,
        [newPayRemaining, newPayRemaining > 0, payLedger.id]
      );
    }
  }

  /**
   * Unapply / Reverse an Allocation
   */
  static async unapplyAllocation(
    client: PoolClient,
    companyId: string,
    allocationId: string
  ) {
    const allocRes = await client.query(
      `SELECT * FROM ledger_allocations WHERE id = $1 AND company_id = $2 AND is_unapplied = false FOR UPDATE`,
      [allocationId, companyId]
    );

    if (!allocRes.rows.length) throw new Error("Active allocation not found.");

    const alloc = allocRes.rows[0];
    const amount = Number(alloc.allocated_amount);
    const isAP = alloc.allocation_type === "AP";
    const table = isAP ? "vendor_ledger_entries" : "customer_ledger_entries";

    // Revert Invoice Ledger Entry
    await client.query(
      `UPDATE ${table} 
       SET remaining_amount = remaining_amount + $1, is_open = true 
       WHERE id = $2`,
      [amount, alloc.ledger_entry_id]
    );

    // Revert Payment Ledger Entry
    await client.query(
      `UPDATE ${table} 
       SET remaining_amount = remaining_amount + $1, is_open = true 
       WHERE id = $2`,
      [amount, alloc.payment_entry_id]
    );

    // Mark allocation as unapplied
    await client.query(
      `UPDATE ledger_allocations SET is_unapplied = true, unapplied_at = NOW() WHERE id = $1`,
      [allocationId]
    );
  }
}

/* import { PoolClient } from "pg";

export class AllocationService {

  static async applyAPPayment(
    client: PoolClient,
    companyId: string,
    paymentId: string,
    vendorId: string,
    allocations: {
      invoice_id: string;
      amount: number;
    }[],
  ) {
    for (const allocation of allocations) {
      const ledgerResult = await client.query(
        `
        SELECT *
        FROM vendor_ledger_entries
        WHERE company_id = $1
        AND document_id = $2
        AND vendor_id = $3
        AND is_open = true
        LIMIT 1
        `,
        [companyId, allocation.invoice_id, vendorId],
      );

      if (!ledgerResult.rows.length) {
        throw new Error("Vendor invoice ledger not found");
      }

      const ledger = ledgerResult.rows[0];

      const remaining = Number(ledger.remaining_amount);

      if (allocation.amount > remaining) {
        throw new Error("Allocation exceeds remaining balance");
      }

      //  * -----------------------------------------------------
      //  * CREATE ALLOCATION
      //  * -----------------------------------------------------

      await client.query(
        `
        INSERT INTO ledger_allocations (
          company_id,
          allocation_type,
          payment_entry_id,
          ledger_entry_id,
          allocated_amount,
          allocation_date
        )
        VALUES ($1,$2,$3,$4,$5,now())
        `,
        [companyId, "AP", paymentId, ledger.id, allocation.amount],
      );

      //  * -----------------------------------------------------
      //  * UPDATE REMAINING
      //  * -----------------------------------------------------

      const newRemaining = remaining - allocation.amount;

      await client.query(
        `
        UPDATE vendor_ledger_entries
        SET
          remaining_amount = $2,
          is_open = $3
        WHERE id = $1
        `,
        [ledger.id, newRemaining, newRemaining > 0],
      );
    }
  }

  //  * =========================================================
  //  * APPLY AR PAYMENT
  //  * =========================================================

  static async applyARPayment(
    client: PoolClient,
    companyId: string,
    paymentId: string,
    customerId: string,
    allocations: {
      invoice_id: string;
      amount: number;
    }[],
  ) {
    for (const allocation of allocations) {
      const ledgerResult = await client.query(
        `
        SELECT *
        FROM customer_ledger_entries
        WHERE company_id = $1
        AND document_id = $2
        AND customer_id = $3
        AND is_open = true
        LIMIT 1
        `,
        [companyId, allocation.invoice_id, customerId],
      );

      if (!ledgerResult.rows.length) {
        throw new Error("Customer invoice ledger not found");
      }

      const ledger = ledgerResult.rows[0];

      const remaining = Number(ledger.remaining_amount);

      if (allocation.amount > remaining) {
        throw new Error("Allocation exceeds remaining balance");
      }

      await client.query(
        `
        INSERT INTO ledger_allocations (
          company_id,
          allocation_type,
          payment_entry_id,
          ledger_entry_id,
          allocated_amount,
          allocation_date
        )
        VALUES ($1,$2,$3,$4,$5,now())
        `,
        [companyId, "AR", paymentId, ledger.id, allocation.amount],
      );

      const newRemaining = remaining - allocation.amount;

      await client.query(
        `
        UPDATE customer_ledger_entries
        SET
          remaining_amount = $2,
          is_open = $3
        WHERE id = $1
        `,
        [ledger.id, newRemaining, newRemaining > 0],
      );
    }
  }
} */
