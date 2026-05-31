// lib/services/payments/allocation.service.ts

import { PoolClient } from "pg";

export class AllocationService {
  //  * =========================================================
  //  * APPLY AP PAYMENT
  //  * =========================================================

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
}
