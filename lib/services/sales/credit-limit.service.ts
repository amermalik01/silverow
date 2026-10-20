// lib/services/sales/credit-limit.service.ts

import { PoolClient } from "pg";

export class CreditLimitService {
  /**
   * Calculates a customer's total outstanding balance (from open ledger entries)
   * plus any pending unposted sales orders, and checks against their credit limit.
   */
  static async validateCreditLimit(
    client: PoolClient,
    companyId: string,
    customerId: string,
    newOrderGrossAmount: number,
    currentSalesOrderId: string,
  ): Promise<void> {
    // 1. Fetch customer's credit limit from parties table
    const partyResult = await client.query(
      `SELECT credit_limit, name FROM parties WHERE id = $1 AND company_id = $2`,
      [customerId, companyId],
    );

    if (!partyResult.rows.length) {
      throw new Error("Customer party record not found.");
    }

    const customer = partyResult.rows[0];
    const creditLimit = Number(customer.credit_limit || 0);

    // If credit limit is 0, it typically means unlimited credit is allowed.
    // Adjust this rule if your business requires a strict 0 limit block.
    if (creditLimit <= 0) {
      return;
    }

    // 2. Calculate remaining open balance from customer_ledger_entries
    const ledgerResult = await client.query(
      `SELECT COALESCE(SUM(
         CASE 
           WHEN UPPER(document_type) LIKE '%PAYMENT%' 
             OR UPPER(document_type) LIKE '%CREDIT_NOTE%' 
             OR UPPER(document_type) LIKE '%CREDIT_MEMO%' 
             OR UPPER(document_type) LIKE '%REFUND%' 
           THEN -ABS(remaining_amount_lcy)
           ELSE ABS(remaining_amount_lcy)
         END
       ), 0) AS outstanding_balance
       FROM customer_ledger_entries
       WHERE company_id = $1 AND customer_id = $2 AND is_open = true`,
      [companyId, customerId],
    );

    const outstandingBalance = Number(
      ledgerResult.rows[0]?.outstanding_balance || 0,
    );

    // 3. (Optional) Include other unposted, active sales orders for this customer
    const unpostedOrdersResult = await client.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS unposted_total
       FROM sales_orders
       WHERE company_id = $1 
         AND customer_id = $2 
         AND is_posted = false 
         AND status != 'cancelled'
         AND id != $3`,
      [companyId, customerId, currentSalesOrderId],
    );

    const unpostedOrdersAmount = Number(
      unpostedOrdersResult.rows[0]?.unposted_total || 0,
    );

    // 4. Calculate Total Exposure
    const totalExposure =
      outstandingBalance + unpostedOrdersAmount + newOrderGrossAmount;

    if (totalExposure > creditLimit) {
      throw new Error(
        `Credit limit exceeded for customer "${customer.name}". ` +
          `Credit Limit: ${creditLimit.toFixed(2)}, Current Exposure (Outstanding + Unposted + New Order): ${totalExposure.toFixed(2)}.`,
      );
    }
  }
}
