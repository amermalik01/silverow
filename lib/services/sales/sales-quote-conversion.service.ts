// ✅ lib/services/sales/sales-quote-conversion.service.ts

import { PoolClient } from "pg";

export class SalesQuoteConversionService {
  static async convertToOrder(
    client: PoolClient,
    companyId: string,
    quoteId: string,
  ) {
    // 1. Load Quote Header
    const quoteRes = await client.query(
      `SELECT * FROM sales_quotes WHERE id = $1 AND company_id = $2`,
      [quoteId, companyId],
    );

    if (!quoteRes.rows.length) throw new Error("Sales quote not found");

    const quote = quoteRes.rows[0];
    
    if (quote.status === "CONVERTED")
      throw new Error("Quote already converted");

    // 2. Load Quote Lines
    const linesRes = await client.query(
      `SELECT * FROM sales_quote_lines WHERE sales_quote_id = $1 ORDER BY line_no ASC`,
      [quoteId],
    );
    const lines = linesRes.rows;
    if (!lines.length) throw new Error("Quote has no lines to convert");

    // 3. Generate Sequence
    const seqRes = await client.query(
      `SELECT get_next_sequence($1,$2) AS code`,
      [companyId, "sales_order"],
    );
    const orderNo = seqRes.rows[0].code;

    // 4. Create Order Header (Mapping Quote fields to Order Schema)
    const orderRes = await client.query(
      `INSERT INTO sales_orders (
        company_id, order_no, customer_id, sales_quote_id, order_date,
        currency_id, exchange_rate, subtotal, vat_amount, total_amount, 
        status, remarks, created_at
      )
      VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, 'OPEN', $10, NOW())
      RETURNING id`,
      [
        companyId,
        orderNo,
        quote.customer_id,
        quote.id,
        quote.currency_id,
        quote.exchange_rate || 1,
        quote.subtotal || 0,
        quote.tax_amount || 0, // Maps Quote tax to Order VAT
        quote.total_amount || 0,
        quote.notes || null,
      ],
    );

    const orderId = orderRes.rows[0].id;

    // 5. Copy Lines with Line Type Support
    for (const line of lines) {
      await client.query(
        `INSERT INTO sales_order_lines (
          company_id, sales_order_id, sales_quote_line_id, line_no,
          line_type, item_id, gl_account_id, description, warehouse_id,
          quantity, unit_price, discount_amount, vat_percent, vat_amount, line_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          companyId,
          orderId,
          line.id,
          line.line_no,
          line.line_type || "ITEM", // Default to ITEM if not specified
          line.item_id,
          line.gl_account_id,
          line.description,
          line.warehouse_id,
          line.quantity,
          line.unit_price,
          line.discount_amount || 0,
          line.tax_percent || 0, // Map tax to VAT
          line.tax_amount || 0, // Map tax to VAT
          line.line_amount || 0,
        ],
      );
    }

    // 6. Update Quote Status
    await client.query(
      `UPDATE sales_quotes SET status = 'CONVERTED', converted_at = NOW(), converted_to_order_id = $1 WHERE id = $2`,
      [orderId, quoteId],
    );

    return { id: orderId, order_no: orderNo };
  }
}

/* import { PoolClient } from "pg";

export class SalesQuoteConversionService {
  static async convertToOrder(
    client: PoolClient,
    companyId: string,
    quoteId: string,
  ) {
    // *
    //  * ============================================
    //  * LOAD QUOTE
    //  * ============================================
    
    const quoteResult = await client.query(
      `
      SELECT *
      FROM sales_quotes
      WHERE id = $1
      `,
      [quoteId],
    );

    if (!quoteResult.rows.length) {
      throw new Error("Sales quote not found");
    }

    const quote = quoteResult.rows[0];

    // *
    //  * ============================================
    //  * VALIDATE STATUS
    //  * ============================================
    
    if (quote.status === "CONVERTED") {
      throw new Error("Quote already converted");
    }

    // *
    //  * ============================================
    //  * LOAD LINES
    //  * ============================================
    
    const linesResult = await client.query(
      `
      SELECT *
      FROM sales_quote_lines
      WHERE sales_quote_id = $1
      ORDER BY line_no ASC
      `,
      [quoteId],
    );

    const lines = linesResult.rows;

    if (!lines.length) {
      throw new Error("Quote has no lines");
    }

    // *
    //  * ============================================
    //  * GENERATE ORDER NUMBER
    //  * ============================================
    
    const seqResult = await client.query(
      `
      SELECT get_next_sequence($1,$2) AS code
      `,
      [companyId, "sales_order"],
    );

    const orderNo = seqResult.rows[0].code;

    // *
    //  * ============================================
    //  * CREATE ORDER HEADER
    //  * ============================================
    
    const orderResult = await client.query(
      `
      INSERT INTO sales_orders (
        company_id,
        order_no,
        customer_id,
        sales_quote_id,
        order_date,
        currency_id,
        exchange_rate,
        subtotal,
        tax_amount,
        total_amount,
        status,
        notes
      )
      VALUES (
        $1,$2,$3,$4,NOW(),$5,
        $6,$7,$8,$9,$10,
        $11
      )
      RETURNING *
      `,
      [
        companyId,
        orderNo,
        quote.customer_id,
        quote.id,
        quote.currency_id,
        quote.exchange_rate || 1,
        quote.subtotal || 0,
        quote.tax_amount || 0,
        quote.total_amount || 0,
        "OPEN",
        quote.notes || null,
      ],
    );

    const order = orderResult.rows[0];

    // *
    //  * ============================================
    //  * COPY LINES
    //  * ============================================
    
    for (const line of lines) {
      await client.query(
        `
        INSERT INTO sales_order_lines (
          company_id,
          sales_order_id,
          sales_quote_line_id,
          line_no,
          item_id,
          description,
          warehouse_id,
          quantity,
          unit_price,
          discount_amount,
          tax_amount,
          line_total
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12
        )
        `,
        [
          companyId,
          order.id,
          line.id,
          line.line_no,
          line.item_id,
          line.description,
          line.warehouse_id,
          Number(line.quantity || 0),
          Number(line.unit_price || 0),
          Number(line.discount_amount || 0),
          Number(line.tax_amount || 0),
          Number(line.line_total || 0),
        ],
      );
    }

    // *
    //  * ============================================
    //  * UPDATE QUOTE STATUS
    //  * ============================================
    
    await client.query(
      `
      UPDATE sales_quotes
      SET
        status = 'CONVERTED',
        converted_at = now(),
        converted_to_order_id = $2
      WHERE id = $1
      `,
      [quoteId, order.id],
    );

    return order;
  }
} */
