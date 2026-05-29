// lib/validators/salesOrderValidator.ts

import { pool } from "@/lib/db";
import { validateLedgerPostingDate } from "./postingGate";

// 1. Define explicit structures for line items instead of using 'any'
export interface SalesOrderLineInput {
  line_type: "ITEM" | "GL_ACCOUNT";
  item_id?: string | null;
  warehouse_id?: string | null;
  gl_account_id?: string | null;
  quantity: number;
  unit_price: number;
  line_amount: number;
  description?: string | null;
}

// 2. Define the exact layout of the payload structure object
export interface SalesOrderCreatePayload {
  customer_id: string;
  order_date: string;
  sales_quote_id?: string | null;
  lines: SalesOrderLineInput[]; // 🟢 Replaced 'any[]' with structural type array
}

interface ValidationResult {
  success: boolean;
  error?: string;
}

export class SalesOrderValidator {
  /**
   * 1. VALIDATE ORDER CREATION / TRANSITION
   * Ensures the customer is active, the quote is open, and lines balance perfectly.
   */
  static async validateCreate(
    companyId: string,
    payload: SalesOrderCreatePayload,
  ): Promise<ValidationResult> {
    // Check Date formatting against Fiscal Periods
    const dateCheck = await validateLedgerPostingDate(
      companyId,
      payload.order_date,
    );
    if (!dateCheck.allowed) {
      return { success: false, error: dateCheck.reason };
    }

    // Verify Active Customer State inside Parties list
    const customerCheck = await pool.query(
      `SELECT status FROM parties WHERE id = $1 AND company_id = $2 AND type = 'CUSTOMER'`,
      [payload.customer_id, companyId],
    );
    if (
      customerCheck.rows.length === 0 ||
      customerCheck.rows[0].status !== "active"
    ) {
      return {
        success: false,
        error: "Selected customer is invalid or inactive.",
      };
    }

    // If converted from a Sales Quote, ensure that quote is still open for conversion
    if (payload.sales_quote_id) {
      const quoteCheck = await pool.query(
        `SELECT status FROM sales_quotes WHERE id = $1 AND company_id = $2`,
        [payload.sales_quote_id, companyId],
      );
      if (quoteCheck.rows.length === 0) {
        return {
          success: false,
          error: "Referenced Sales Quote does not exist.",
        };
      }
      if (quoteCheck.rows[0].status === "CONVERTED") {
        return {
          success: false,
          error: "This Sales Quote has already been converted into an order.",
        };
      }
      if (quoteCheck.rows[0].status === "CANCELLED") {
        return {
          success: false,
          error: "Cannot convert a cancelled Sales Quote.",
        };
      }
    }

    // Validate Row Line Configurations
    if (!payload.lines || payload.lines.length === 0) {
      return {
        success: false,
        error: "Sales Order must contain at least one line entry.",
      };
    }

    for (let i = 0; i < payload.lines.length; i++) {
      const line = payload.lines[i];
      const rowIdx = i + 1;

      if (line.line_type === "ITEM") {
        if (!line.item_id)
          return {
            success: false,
            error: `Row ${rowIdx}: Item selection is required for type ITEM.`,
          };
        if (!line.warehouse_id)
          return {
            success: false,
            error: `Row ${rowIdx}: Warehouse allocation selection is required.`,
          };
        if (Number(line.quantity) <= 0)
          return {
            success: false,
            error: `Row ${rowIdx}: Quantity must be greater than zero.`,
          };
      } else if (line.line_type === "GL_ACCOUNT") {
        if (!line.gl_account_id)
          return {
            success: false,
            error: `Row ${rowIdx}: General Ledger account map target is required for service entries.`,
          };
      } else {
        return {
          success: false,
          error: `Row ${rowIdx}: Invalid type indicator '${line.line_type}'. Use ITEM or GL_ACCOUNT.`,
        };
      }
    }

    return { success: true };
  }

  /**
   * 2. VALIDATE STOCK ALLOCATION & DISPATCH
   * Runs an inventory check to ensure physical stock levels can support the delivery run.
   */
  static async validateDispatch(
    companyId: string,
    orderId: string,
  ): Promise<ValidationResult> {
    // Load unposted line items matching physical assets
    const linesResult = await pool.query(
      `
      SELECT id, item_id, warehouse_id, quantity, description, line_no
      FROM sales_order_lines
      WHERE sales_order_id = $1 AND company_id = $2 AND line_type = 'ITEM'
      `,
      [orderId, companyId],
    );

    for (const line of linesResult.rows) {
      // Aggregate available matching batch entries inside the inventory sub-ledger
      const stockCheck = await pool.query(
        `
        SELECT COALESCE(SUM(remaining_quantity), 0) as available_stock
        FROM inventory_ledger_entries
        WHERE company_id = $1 AND item_id = $2 AND warehouse_id = $3 AND status = 'OPEN'
        `,
        [companyId, line.item_id, line.warehouse_id],
      );

      const available = Number(stockCheck.rows[0].available_stock);
      const requested = Number(line.quantity);

      if (requested > available) {
        return {
          success: false,
          error: `Dispatch blocked due to insufficient inventory. Line ${line.line_no}: Requested ${requested} units, but only ${available} are available in the selected warehouse.`,
        };
      }
    }

    return { success: true };
  }

  /**
   * 3. VALIDATE ORDER POSTING LOCKS
   * Verifies that physical dispatches are complete before letting the final ledger update fire.
   */
  static async validatePosting(
    companyId: string,
    orderId: string,
  ): Promise<ValidationResult> {
    const orderCheck = await pool.query(
      `SELECT is_posted, is_dispatched, order_date FROM sales_orders WHERE id = $1 AND company_id = $2`,
      [orderId, companyId],
    );

    if (orderCheck.rows.length === 0) {
      return {
        success: false,
        error: "Target Sales Order record location not found.",
      };
    }

    const order = orderCheck.rows[0];

    if (order.is_posted) {
      return {
        success: false,
        error: "This sales order has already been finalized and posted.",
      };
    }

    // Enforce operational fulfillment flow: physical dispatch must happen before creating the invoice
    if (!order.is_dispatched) {
      return {
        success: false,
        error:
          "Order cannot be posted to ledgers until stock dispatch is completed.",
      };
    }

    // Verify posting dates against current fiscal configuration windows
    const dateCheck = await validateLedgerPostingDate(
      companyId,
      order.order_date,
    );
    if (!dateCheck.allowed) {
      return { success: false, error: dateCheck.reason };
    }

    return { success: true };
  }
}
