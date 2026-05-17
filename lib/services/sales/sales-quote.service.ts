// lib/services/sales/sales-quote.service.ts

import { PoolClient } from "pg";
import { SalesQuotePayload } from "@/types/sales-quote";

export class SalesQuoteService {
  static async create(
    client: PoolClient,
    companyId: string,
    payload: SalesQuotePayload,
    quoteNo: string,
  ) {
    /**
     * =====================================================
     * VALIDATE HEADER
     * =====================================================
     */
    if (!payload.quote.customer_id) {
      throw new Error("Customer is required");
    }

    if (!payload.lines || payload.lines.length === 0) {
      throw new Error("At least one line is required");
    }

    /**
     * =====================================================
     * INSERT HEADER
     * =====================================================
     */
    const quoteResult = await client.query(
      `
      INSERT INTO sales_quotes (
        company_id,
        quote_no,
        customer_id,
        quote_date,
        valid_until,
        currency_id,
        exchange_rate,
        subtotal,
        tax_amount,
        total_amount,
        notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
      `,
      [
        companyId,
        quoteNo,
        payload.quote.customer_id,
        payload.quote.quote_date,
        payload.quote.valid_until || null,
        payload.quote.currency_id || null,
        payload.quote.exchange_rate || 1,
        payload.quote.subtotal || 0,
        payload.quote.tax_amount || 0,
        payload.quote.total_amount || 0,
        payload.quote.notes || null,
      ],
    );

    const quote = quoteResult.rows[0];

    /**
     * =====================================================
     * INSERT LINES (HARDENED)
     * =====================================================
     */
    for (const line of payload.lines) {
      const qty = Number(line.quantity || 0);
      const price = Number(line.unit_price || 0);
      const discount = Number(line.discount_amount || 0);
      const tax = Number(line.tax_amount || 0);

      if (qty < 0) {
        throw new Error("Invalid quantity in quote line");
      }

      await client.query(
        `
        INSERT INTO sales_quote_lines (
          company_id,
          sales_quote_id,
          line_no,
          item_id,
          description,
          warehouse_id,
          quantity,
          unit_price,
          discount_amount,
          tax_amount,
          line_amount
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `,
        [
          companyId,
          quote.id,
          line.line_no || 10000,
          line.item_id || null,
          line.description || null,
          line.warehouse_id || null,
          qty,
          price,
          discount,
          tax,
          qty * price - discount + tax,
        ],
      );
    }

    return quote;
  }
}

/* import { PoolClient } from "pg";

import { SalesQuotePayload } from "@/types/sales-quote";

export class SalesQuoteService {
  static async create(
    client: PoolClient,
    companyId: string,
    payload: SalesQuotePayload,
    quoteNo: string,
  ) {
    const quoteResult = await client.query(
      `
      INSERT INTO sales_quotes (
        company_id,
        quote_no,
        customer_id,
        quote_date,
        valid_until,
        currency_id,
        exchange_rate,
        subtotal,
        tax_amount,
        total_amount,
        notes
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        $11
      )
      RETURNING *
      `,
      [
        companyId,
        quoteNo,
        payload.quote.customer_id,
        payload.quote.quote_date,
        payload.quote.valid_until || null,
        payload.quote.currency_id || null,
        payload.quote.exchange_rate || 1,
        payload.quote.subtotal || 0,
        payload.quote.tax_amount || 0,
        payload.quote.total_amount || 0,
        payload.quote.notes || null,
      ],
    );

    const quote = quoteResult.rows[0];

    for (const [index, line] of payload.lines.entries()) {
      await client.query(
        `
        INSERT INTO sales_quote_lines (
          company_id,
          sales_quote_id,
          line_no,
          item_id,
          description,
          warehouse_id,
          quantity,
          unit_price,
          discount_percent,
          tax_percent,
          line_amount
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11
        )
        `,
        [
          companyId,
          quote.id,
          index + 1,
          line.item_id || null,
          line.description || null,
          line.warehouse_id || null,
          Number(line.quantity || 0),
          Number(line.unit_price || 0),
          Number(line.discount_percent || 0),
          Number(line.tax_percent || 0),
          Number(line.line_total || 0),
        ],
      );
    }

    return quote;
  }
}
 */
