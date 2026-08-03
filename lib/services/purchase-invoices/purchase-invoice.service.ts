// lib/services/purchase-invoices/purchase-invoice.service.ts

import { PoolClient } from "pg";
/* import { pool } from "@/lib/db";

import { GLPostingService } from "@/lib/services/gl/gl-posting.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";

import { JournalLineInput } from "@/types/journal";
import { PurchaseOrderStatusService } from "../purchase-orders/purchase-order-status.service";
import { GRNIClearingService } from "../grni/grni-clearing.service";

import { PurchaseInvoice } from "@/types/purchase-invoice";

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
} */

export class PurchaseInvoiceService {
  private static async getPayableAccount(
    client: PoolClient,
    companyId: string,
  ): Promise<string> {
    const result = await client.query(
      `
    SELECT payable_account_id
    FROM purchase_posting_groups
    WHERE company_id = $1
    LIMIT 1
    `,
      [companyId],
    );

    if (!result.rows.length) {
      throw new Error("Purchase posting group not configured");
    }

    return result.rows[0].payable_account_id;
  }

  /* static async list(companyId: string, filters: ListFilters = {}) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const offset = (page - 1) * limit;

    const queryParams: unknown[] = [companyId];
    let paramIndex = 2;

    let whereClause = "WHERE pi.company_id = $1";

    // Filter by Invoice No or Purchase Order No
    if (filters.search) {
      whereClause += ` AND (pi.invoice_no ILIKE $${paramIndex} OR po.order_no ILIKE $${paramIndex})`;
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Filter by explicit Status
    if (filters.status) {
      whereClause += ` AND pi.status = $${paramIndex}`;
      queryParams.push(filters.status.toUpperCase());
      paramIndex++;
    }

    // Filter by Date Ranges
    if (filters.startDate) {
      whereClause += ` AND pi.invoice_date >= $${paramIndex}`;
      queryParams.push(filters.startDate);
      paramIndex++;
    }
    if (filters.endDate) {
      whereClause += ` AND pi.invoice_date <= $${paramIndex}`;
      queryParams.push(filters.endDate);
      paramIndex++;
    }

    // Count total matching records for pagination metadata
    const countQuery = `
      SELECT COUNT(DISTINCT pi.id) as total
      FROM purchase_invoices pi
      LEFT JOIN purchase_orders po ON pi.purchase_order_id = po.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0", 10);
    const totalPages = Math.ceil(totalRecords / limit);

    // Retrieve data row payloads
    const dataQuery = `
      SELECT 
        pi.*,
        po.order_no as purchase_order_no
      FROM purchase_invoices pi
      LEFT JOIN purchase_orders po ON pi.purchase_order_id = po.id
      ${whereClause}
      ORDER BY pi.invoice_date DESC, pi.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await pool.query(dataQuery, queryParams);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    };
  } */

  //  * =========================================================
  //  * POST PURCHASE INVOICE
  //  * =========================================================

  /* static async postInvoice(
    client: PoolClient,
    companyId: string,
    invoiceId: string,
    userId?: string,
  ) {
    const invoiceResult = await client.query(
      `
      SELECT *
      FROM purchase_invoices
      WHERE id = $1
      `,
      [invoiceId],
    );

    if (!invoiceResult.rows.length) {
      throw new Error("Invoice not found");
    }

    const invoice = invoiceResult.rows[0];

    if (invoice.is_posted) {
      throw new Error("Invoice already posted");
    }

    const linesResult = await client.query(
      `
      SELECT *
      FROM purchase_invoice_lines
      WHERE purchase_invoice_id = $1
      ORDER BY line_no ASC
      `,
      [invoiceId],
    );

    const lines = linesResult.rows;

    if (!lines.length) {
      throw new Error("No invoice lines found");
    }

    const payableAccountId = await this.getPayableAccount(client, companyId);
    const glLines: JournalLineInput[] = [];

    for (const line of lines) {
      if (line.purchase_order_line_id) {
        const poLineResult = await client.query(
          `
          SELECT
            quantity,
            received_quantity,
            invoiced_quantity
          FROM purchase_order_lines
          WHERE id = $1
          `,
          [line.purchase_order_line_id],
        );

        if (!poLineResult.rows.length) {
          throw new Error("Purchase order line not found");
        }

        const poLine = poLineResult.rows[0];

        const receivedQty = Number(poLine.received_quantity || 0);

        const alreadyInvoiced = Number(poLine.invoiced_quantity || 0);

        const remainingToInvoice = receivedQty - alreadyInvoiced;

        if (Number(line.quantity) > remainingToInvoice) {
          throw new Error(
            `Invoice quantity exceeds received quantity for item ${line.item_id}`,
          );
        }
      }

      const grniLines = await GRNIClearingService.buildLines(
        client,
        invoice.id,
      );

      glLines.push(...grniLines);

      const totalAmount = lines.reduce(
        (sum, line) => sum + Number(line.quantity) * Number(line.unit_cost),
        0,
      );

      //  * ---------------------------------------------------
      //  * CR AP LIABILITY
      //  * ---------------------------------------------------

      glLines.push({
        account_id: payableAccountId,

        debit: 0,

        credit: totalAmount,

        reference_type: "PURCHASE_INVOICE",

        reference_id: invoice.id,
      });
    }

    //  * -----------------------------------------------------
    //  * VALIDATE BALANCE
    //  * -----------------------------------------------------

    GLValidationService.validateBalanced(glLines);

    //  * -----------------------------------------------------
    //  * POST JOURNAL
    //  * -----------------------------------------------------

    const journal = await GLPostingService.postJournal(client, {
      company_id: companyId,

      entry_date: invoice.invoice_date,

      source: "PURCHASE",

      journal_type: "PURCHASE_INVOICE",

      reference: invoice.invoice_no,

      source_id: invoice.id,

      description: `Purchase Invoice ${invoice.invoice_no}`,

      created_by: userId || null,

      lines: glLines,
    });

    for (const line of lines) {
      if (!line.purchase_order_line_id) {
        continue;
      }

      await client.query(
        `
        UPDATE purchase_order_lines
        SET
          invoiced_quantity =
            COALESCE(invoiced_quantity,0) + $1,

          updated_at = now()

        WHERE id = $2
        `,
        [Number(line.quantity), line.purchase_order_line_id],
      );
    }

    //  * -----------------------------------------------------
    //  * CREATE AP LEDGER ENTRY
    //  * -----------------------------------------------------

    await client.query(
      `
        INSERT INTO vendor_ledger_entries (
          company_id,
          vendor_id,
          document_type,
          document_id,
          document_no,
          posting_date,
          description,
          original_amount,
          remaining_amount,
          currency_id,
          is_open,
          journal_entry_id
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          true,$11
        )
        `,
      [
        companyId,
        invoice.supplier_id,
        "PURCHASE_INVOICE",
        invoice.id,
        invoice.invoice_no,
        invoice.invoice_date,
        "Purchase invoice",
        invoice.total_amount,
        invoice.total_amount,
        invoice.currency_id || null,
        journal.id,
      ],
    );

    if (invoice.purchase_order_id) {
      await PurchaseOrderStatusService.recalculate(
        client,
        invoice.purchase_order_id,
      );
    }

    await client.query(
      `
      UPDATE purchase_invoices
      SET
        is_posted = true,
        posted_at = now(),
        journal_entry_id = $2,
        updated_at = now()
      WHERE id = $1
      `,
      [invoiceId, journal.id],
    );
  } */
}
